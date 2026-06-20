import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import * as ExcelJS from "exceljs";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const moduleType = formData.get("moduleType") as string;
    const targetWorkspaceId = formData.get("targetWorkspaceId") as string;
    const targetSubworkspaceId = formData.get("targetSubworkspaceId") as string;
    const finalWorkspaceId = targetSubworkspaceId || targetWorkspaceId;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: "Empty workbook" }, { status: 400 });
    }

    // Fetch dictionaries
    const [statusRes, priorityRes, deptRes, usersRes, wsMembersRes] = await Promise.all([
      supabase.from("status_master").select("id, status_name").eq('scope_type', 'TASK').eq('is_deleted', false),
      supabase.from("priority_master").select("id, priority_name").eq('is_deleted', false),
      supabase.from("departments").select("id, name"),
      supabase.from("user_master").select("id, full_name, email"),
      moduleType === 'TASK' && finalWorkspaceId 
        ? supabase.from("workspace_members").select("user_id").eq("workspace_id", finalWorkspaceId)
        : Promise.resolve({ data: [] })
    ]);

    const statuses = new Map(statusRes.data?.map(s => [s.status_name.toLowerCase(), s.id]));
    const priorities = new Map(priorityRes.data?.map(p => [p.priority_name.toLowerCase(), p.id]));
    const departments = new Map(deptRes.data?.map(d => [d.name.toLowerCase(), d.id]));
    const users = new Map(usersRes.data?.map(u => [u.full_name.toLowerCase(), u.id]));
    const wsMemberIds = new Set(wsMembersRes.data?.map(m => m.user_id) || []);

    const rows: any[] = [];
    const taskAssignees: any[] = []; 
    let errorMsg = "";

    worksheet.eachRow((row, rowNumber) => {
      // Break early if we already found an error
      if (errorMsg) return;
      if (rowNumber === 1) return; // Skip header

      if (moduleType === 'TASK') {
        const subject = row.getCell(1).text?.trim();
        const desc = row.getCell(2).text?.trim();
        const statusName = row.getCell(3).text?.trim();
        const priorityName = row.getCell(4).text?.trim();
        const deptName = row.getCell(5).text?.trim();
        const start = row.getCell(6).text?.trim();
        const end = row.getCell(7).text?.trim();
        const ownerName = row.getCell(8).text?.trim();
        const exec1 = row.getCell(9).text?.trim();
        const exec2 = row.getCell(10).text?.trim();
        const exec3 = row.getCell(11).text?.trim();

        if (!subject || !statusName || !priorityName || !deptName || !start || !end || !ownerName || !exec1) {
          // If the entire row is blank, we can just skip it instead of erroring
          if (!subject && !desc && !statusName) return; 
          errorMsg = `Row ${rowNumber}: Missing mandatory fields. All fields are required (including Executor 1).`;
          return;
        }

        const status_id = statuses.get(statusName.toLowerCase());
        const priority_id = priorities.get(priorityName.toLowerCase());
        const department_id = departments.get(deptName.toLowerCase());
        const owner_id = users.get(ownerName.toLowerCase());

        if (!status_id) { errorMsg = `Row ${rowNumber}: Unknown status '${statusName}'`; return; }
        if (!priority_id) { errorMsg = `Row ${rowNumber}: Unknown priority '${priorityName}'`; return; }
        if (!department_id) { errorMsg = `Row ${rowNumber}: Unknown department '${deptName}'`; return; }
        if (!owner_id) { errorMsg = `Row ${rowNumber}: Unknown user '${ownerName}'`; return; }

        const executorNames = [exec1, exec2, exec3].filter(Boolean) as string[];
        const executorIds: string[] = [];
        for (const en of executorNames) {
          const eId = users.get(en.toLowerCase());
          if (!eId) {
            errorMsg = `Row ${rowNumber}: Unknown executor '${en}'`;
            return;
          }
          executorIds.push(eId);
        }

        const taskId = crypto.randomUUID();

        rows.push({
          id: taskId,
          subject: subject,
          description: desc,
          status_id,
          priority_id,
          department_id,
          start_date: new Date(start).toISOString(),
          end_date: new Date(end).toISOString(),
          workspace_id: finalWorkspaceId,
          created_by: user.id,
          assigned_to: owner_id,
          owner_id: owner_id
        });

        // Track who is explicitly assigned
        const explicitlyAssigned = new Set<string>();

        // Add owner
        // The database trigger trg_sync_task_owner automatically inserts the OWNER role
        // so we don't need to push it to taskAssignees here. We just mark as explicitlyAssigned.
        explicitlyAssigned.add(owner_id);
        
        // Add executors
        for (const eId of executorIds) {
          if (!explicitlyAssigned.has(eId)) { 
            taskAssignees.push({ task_id: taskId, user_id: eId, participation_role: 'EXECUTOR' });
            explicitlyAssigned.add(eId);
          }
        }

        // Auto-Watchers Logic: anyone in the workspace who is not an owner or executor
        for (const memberId of Array.from(wsMemberIds)) {
          if (!explicitlyAssigned.has(memberId)) {
             taskAssignees.push({ task_id: taskId, user_id: memberId, participation_role: 'WATCHER' });
          }
        }

      }
    });

    if (errorMsg) {
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows found to import." }, { status: 400 });
    }

    if (moduleType === 'TASK') {
      const { error: taskErr } = await adminClient.from("tasks").insert(rows);
      if (taskErr) throw taskErr;

      try {
        // Chunk taskAssignees insert to avoid query too large errors for huge teams
        const chunkSize = 2000;
        const insertPromises = [];
        for (let i = 0; i < taskAssignees.length; i += chunkSize) {
          const chunk = taskAssignees.slice(i, i + chunkSize);
          insertPromises.push(adminClient.from("task_participants").upsert(chunk, { onConflict: 'task_id,user_id' }));
        }
        
        const results = await Promise.all(insertPromises);
        for (const res of results) {
          if (res.error) throw res.error;
        }
      } catch (err: any) {
        // Rollback: delete the tasks we just inserted to prevent data duplication/orphaning
        const taskIds = rows.map(r => r.id);
        if (taskIds.length > 0) {
          await adminClient.from("tasks").delete().in("id", taskIds);
        }
        throw new Error(`Failed to assign participants. Rolled back tasks. Details: ${err.message || JSON.stringify(err)}`);
      }
    } else {
       return NextResponse.json({ error: "Module type not supported yet." }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Successfully migrated ${rows.length} records.`, rowsProcessed: rows.length });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
