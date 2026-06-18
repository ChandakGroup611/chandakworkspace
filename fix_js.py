import sys

with open('rebuild_grid_2x2_clean.js', 'r') as f:
    content = f.read()

content = content.replace(r"/<\//div>\s*<\//div>\s*$/", "new RegExp('</div>\\\\s*</div>\\\\s*$')")
content = content.replace(r"/<\//div>\s*<\//div>\s*<\//div>\s*$/", "new RegExp('</div>\\\\s*</div>\\\\s*</div>\\\\s*$')")
content = content.replace(r"/<\//div>\s*<\//div>\s*<\//div>\s*<\//div>\s*$/", "new RegExp('</div>\\\\s*</div>\\\\s*</div>\\\\s*</div>\\\\s*$')")
content = content.replace(r"/<label[\s\S]*?<\//label>/", "new RegExp('<label[\\\\s\\\\S]*?</label>', 'g')")
content = content.replace(r"replace('<div className=\"space-y-1.5 mt-5\">', '<div className=\"space-y-1.5\">').replace(/<label[\s\S]*?<\/label>/, '').replace(/<label[\s\S]*?<\/label>/, '')", "replace('<div className=\"space-y-1.5 mt-5\">', '<div className=\"space-y-1.5\">').replace(/<label[\\s\\S]*?<\\/label>/g, '')")

# Actually let's just do simple replacements for everything using .replace("</div>", "") where needed!
# It's cleaner to rewrite those lines.

lines = content.split('\n')
for i, line in enumerate(lines):
    if "const tagsBlockClean =" in line:
        lines[i] = "const tagsBlockClean = tagsBlockRaw.replace(/<\\/div>\\s*<\\/div>\\s*$/, '').trim();".replace("\\/", "/")
    if "const tagsBlockFinal =" in line:
        lines[i] = "const tagsBlockFinal = tagsBlockClean.replace('<div className=\"space-y-1.5 mt-5\">', '<div className=\"space-y-1.5\">').replace(/<label[\\s\\S]*?<\\/label>/g, '');".replace("\\/", "/")
    if "const attachmentsInner =" in line:
        lines[i] = "const attachmentsInner = attachmentsRaw.replace(/<\\/div>\\s*<\\/div>\\s*$/, '').replace('{/* Attachments */}', '').trim();".replace("\\/", "/")
    if "const s5Clean =" in line:
        lines[i] = "const s5Clean = s5BlockRaw.replace(/<\\/div>\\s*<\\/div>\\s*<\\/div>\\s*<\\/div>\\s*$/, '').replace(/<\\/div>\\s*<\\/div>\\s*<\\/div>\\s*$/, '').trim();".replace("\\/", "/")
    if "const s5InnerContent =" in line:
        lines[i] = "const s5InnerContent = s5BlockRaw.trim().replace(/<\\/div>\\s*<\\/div>\\s*<\\/div>\\s*$/, '').replace(/<\\/div>\\s*<\\/div>\\s*$/, '');".replace("\\/", "/")

with open('rebuild_grid_2x2_clean.js', 'w') as f:
    f.write('\n'.join(lines))

print("Fixed!")
