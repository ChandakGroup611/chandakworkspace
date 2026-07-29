const fs = require('fs');

const path = 'd:/adios/lib/actions/requirements.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /(r\.task\.assigned_to_user = u \? \{ full_name: u\.full_name \} : null;).*?(export async function markRequirementPutToUse)/s;

const replacement = `r.task.assigned_to_user = u ? { full_name: u.full_name } : null;
           }
        });
     }
  }

  return anyData;
}

export async function evaluateRequirementReadyToUse(taskId: string) {
  try {
    const { data: links } = await supabaseAdmin.from('requirement_tasks').select('requirement_id').eq('task_id', taskId);
    if (!links || links.length === 0) return;

    for (const link of links) {
      const reqId = link.requirement_id;
      const { data: allLinkedTasks } = await supabaseAdmin.from('requirement_tasks').select('task_id').eq('requirement_id', reqId);
      if (!allLinkedTasks) continue;

      const taskIds = allLinkedTasks.map(t => t.task_id);
      const { data: tasks } = await supabaseAdmin.from('tasks').select('status_id').in('id', taskIds).eq('is_deleted', false);
      if (!tasks) continue;

      const statusIds = tasks.map(t => t.status_id).filter(Boolean);
      if (statusIds.length === 0) continue;

      const { data: statuses } = await supabaseAdmin.from('status_master').select('id, is_closed').in('id', statusIds);
      const isAllClosed = statuses && statuses.every(s => s.is_closed === true);

      if (isAllClosed) {
        const { data: req } = await supabaseAdmin.from('requirements').select('approval_status, code, requester_id, creator_id').eq('id', reqId).single();
        if (req && req.approval_status !== 'Ready to Put to Use' && req.approval_status !== 'Closed') {
          await supabaseAdmin.from('requirements').update({ approval_status: 'Ready to Put to Use' }).eq('id', reqId);
          await logActivityEvent('REQUIREMENT', reqId, 'STATUS_UPDATE', { status: req.approval_status }, { status: 'Ready to Put to Use' }, 'SYSTEM');
          
          const notifyUserId = req.requester_id || req.creator_id;
          if (notifyUserId) {
             const { dispatchNotification } = await import('@/lib/actions/notifications');
             await dispatchNotification(
               notifyUserId, 
               'Requirement Ready to Use', 
               \`All tasks for Requirement \${req.code || reqId} are closed. It is now ready to be put to use.\`, 
               \`/requirements/\${reqId}\`, 
               'REQUIREMENT', 
               'STATUS_READY_TO_USE'
             ).catch(e => console.error(e));
          }
        }
      }
    }
  } catch (err) {
    console.error('evaluateRequirementReadyToUse error:', err);
  }
}

$2`;

content = content.replace(regex, replacement);
fs.writeFileSync(path, content, 'utf8');
