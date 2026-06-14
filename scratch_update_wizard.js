const fs = require('fs');
let content = fs.readFileSync('d:/adios/components/tickets/TicketCreationWizard.tsx', 'utf8');

const newHandleFormSubmit = `  const handleFormSubmit = async (data: any) => {
    try {
      const { createEnterpriseTicket } = await import("@/lib/actions/tickets");
      const { initializeAttachmentUpload } = await import("@/lib/actions/attachments");
      const supabase = createClient();
      
      const scopeType = scope?.code === "ERP" ? "ERP/SOFTWARE" : scope?.code;
      
      const payload: any = {
        scope_type: scopeType,
        title: data.subject || data.title || \`Operational Incident - \${scopeType}\`,
        description: data.remark || data.description || "Zero explicit content captured.",
        priority_id: data.priorityId || null,
        issue_type_id: data.issueTypeId || null,
        issue_sub_type_id: data.issueSubtypeId || null,
        category_id: data.categoryId || null,
        sub_category_id: data.subcategoryId || null,
        asset_id: data.assetId || null,
        software_system_id: data.systemId || null,
        module_id: data.moduleId || null,
        sub_module_id: data.submoduleId || null,
        custom_fields: {
          requirement_description: data.requirement_description || null,
          business_reason: data.business_reason || null
        }
      };

      if (data.isReqCategory) {
        const { createRequirement } = await import("@/lib/actions/requirements");
        const { data: { user } } = await supabase.auth.getUser();
        
        let prefix = "OTH";
        if (scopeType === "ERP/SOFTWARE") prefix = "ERP";
        else if (scopeType === "INFRA") prefix = "INF";

        const reqCode = \`\${prefix}-REQ-\${new Date().getFullYear()}-\${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}\`;

        // The immutable snapshot exactly as entered
        const intakeSnapshot = {
          scope: scopeType,
          softwareSystem: data.systemId, // We might not have the text here without a lookup, but the payload has IDs
          module: data.moduleId,
          submodule: data.submoduleId,
          category: data.categoryId,
          subCategory: data.subcategoryId,
          priority: data.priorityId,
          subject: payload.title,
          description: payload.description,
          requirementDescription: data.requirement_description,
          businessReason: data.business_reason
        };

        const reqPayload = {
          workspace_id: "",
          requirement_code: reqCode,
          title: payload.title,
          objective: payload.description,
          functional_scope: data.requirement_description || "Not provided.",
          technical_scope: undefined,
          created_by: user?.id || "",
          scope: scopeType,
          software_system_id: data.systemId || null,
          module_id: data.moduleId || null,
          sub_module_id: data.submoduleId || null,
          category_id: data.categoryId || null,
          sub_category_id: data.subcategoryId || null,
          priority_id: data.priorityId || null,
          requirement_reason: data.business_reason || null,
          requirement_details: data.requirement_description || null,
          requester_id: user?.id || null,
          intake_snapshot: intakeSnapshot,
          custom_fields: {
            ...payload,
            business_reason: data.business_reason
          }
        };

        const result = await createRequirement(reqPayload);

        if (result && result.id) {
          if (data.attachment) {
            try {
              const uploadRes = await initializeAttachmentUpload({
                module_type: 'requirement',
                record_id: result.id,
                file_name: data.attachment.name,
                mime_type: data.attachment.type,
                file_size: data.attachment.size
              });

              const { error: uploadError } = await supabase.storage
                .from('requirement-files')
                .uploadToSignedUrl(uploadRes.path, uploadRes.token, data.attachment);

              if (uploadError) console.error("Failed to upload attachment:", uploadError);
            } catch (attErr) {
              console.error("Failed to initialize attachment:", attErr);
            }
          }
          onSuccess(result.code);
          return;
        }
      }

      const result = await createEnterpriseTicket(payload);`;

content = content.replace(/  const handleFormSubmit = async \(data: any\) => \{[\s\S]*?const result = await createEnterpriseTicket\(payload\);/, newHandleFormSubmit);
fs.writeFileSync('d:/adios/components/tickets/TicketCreationWizard.tsx', content);
