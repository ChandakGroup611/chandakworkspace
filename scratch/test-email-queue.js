const fs = require('fs');
const tsCode = fs.readFileSync('./lib/actions/email-queue.ts', 'utf8');

// We just run this in node directly by converting imports to requires
const jsCode = tsCode
  .replace(/import { createClient } from "@supabase\/supabase-js";/g, 'const { createClient } = require("@supabase/supabase-js");')
  .replace(/export async function processEmailQueueAsync/g, 'async function processEmailQueueAsync')
  .replace(/const nodemailer = \(await import\('nodemailer'\)\)\.default;/g, 'const nodemailer = require("nodemailer");');

eval(jsCode + '\nprocessEmailQueueAsync().then(() => console.log("Done")).catch(console.error);');
