const url = "https://cffmgqdypmilwxkwhhve.supabase.co/rest/v1/workspaces?limit=1";

fetch(url, {
  headers: {
    "apikey": "sb_publishable_fcEzN22lzD5ro1-_hqBfFw_Bsjr7VGY",
    "Authorization": "Bearer sb_publishable_fcEzN22lzD5ro1-_hqBfFw_Bsjr7VGY"
  }
})
.then(res => res.json())
.then(data => {
  console.log("WORKSPACES COLUMNS:", Object.keys(data[0] || {}));
})
.catch(err => {
  console.error("ERROR:", err);
});
