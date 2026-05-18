const url = "https://cffmgqdypmilwxkwhhve.supabase.co/rest/v1/workspaces?select=*,status:workflow_states(name,code),company:companies(name,code),priority:master_priorities(name,code),department:departments(name,code,scope_id),workspace_members(user_id)";

fetch(url, {
  headers: {
    "apikey": "sb_publishable_fcEzN22lzD5ro1-_hqBfFw_Bsjr7VGY",
    "Authorization": "Bearer sb_publishable_fcEzN22lzD5ro1-_hqBfFw_Bsjr7VGY"
  }
})
.then(async res => {
  const text = await res.text();
  console.log("RESPONSE STATUS:", res.status);
  console.log("RESPONSE TEXT:", text);
})
.catch(err => {
  console.error("ERROR:", err);
});
