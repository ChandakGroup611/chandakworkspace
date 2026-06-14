const fs = require('fs');
let content = fs.readFileSync('d:/adios/lib/actions/requirements.ts', 'utf8');

const regex = /creator:user_master!requirements_creator_id_fkey\(full_name\)/g;
content = content.replace(regex, 'requester:user_master!requirements_requester_id_fkey(full_name)');

const fetchReqsRegex = /(export async function fetchRequirements[\s\S]*?if \(error\) \{[\s\S]*?return \[\];\s*\})/g;

content = content.replace(fetchReqsRegex, (match) => {
  return match + `
  if (data && data.length > 0) {
    const creatorIds = [...new Set(data.map(d => d.creator_id).filter(Boolean))];
    if (creatorIds.length > 0) {
      const { data: users } = await supabaseAdmin.from('user_master').select('id, full_name').in('id', creatorIds);
      if (users) {
        const userMap = {};
        users.forEach(u => userMap[u.id] = u);
        data.forEach(d => {
          if (d.creator_id && userMap[d.creator_id]) {
            d.creator = userMap[d.creator_id];
          }
        });
      }
    }
  }`;
});

fs.writeFileSync('d:/adios/lib/actions/requirements.ts', content);
console.log("Fixed fetchRequirements mapping");
