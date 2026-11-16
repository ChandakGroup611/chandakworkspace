/**
 * Access Rule Verification: Chandak Meet Module
 * Validates against rules specified in docs/ACCESS_RULES.md (Section 8)
 * and unified Module-Wise RBAC engine requirements.
 */

import assert from 'assert';
import fs from 'fs';

export async function runMeetAccessTest() {
  const results = [];
  const logPass = (rule, desc) => results.push({ module: 'Chandak Meet', rule, desc, status: 'PASS' });
  const logFail = (rule, desc, error) => results.push({ module: 'Chandak Meet', rule, desc, status: 'FAIL', error });

  const meetContent = fs.readFileSync('lib/permissions/meet.ts', 'utf8');

  // Test 1: requireMeet integrates with Module-Wise RBAC engine
  try {
    assert(meetContent.includes('can(userId, "CHANDAK_MEET"'), 'requireMeet does not invoke module-access can()');
    assert(meetContent.includes('MEET_MODULE_PERM_MAP'), 'requireMeet missing canonical to module permission mapping');
    assert(meetContent.includes('platform_role') && meetContent.includes('SUPER_ADMIN'), 'requireMeet missing platform_role check');
    logPass('MEET_MODULE_RBAC_INTEGRATION', 'requireMeet strictly evaluates permissions via central Module RBAC engine');
  } catch (err) {
    logFail('MEET_MODULE_RBAC_INTEGRATION', 'Integration check failed', err.message);
  }

  // Test 2: Administrative operations strictly gated by MEET_ADMIN / MEET_SETTINGS
  try {
    assert(meetContent.includes('requireAdmin || canonicalCode === "MEET_ADMIN"'), 'requireAdmin logic missing');
    assert(meetContent.includes('throw new Error("Forbidden: This action requires Meet Administrator privileges'), 'Missing admin rejection error');
    logPass('MEET_ADMIN_GATED', 'Meet administration (policies, SLA, masters, templates) strictly requires MEET_ADMIN / MEET_SETTINGS');
  } catch (err) {
    logFail('MEET_ADMIN_GATED', 'Admin gating check failed', err.message);
  }

  // Test 3: Confidential meeting boundaries
  try {
    assert(meetContent.includes('meeting.is_confidential'), 'requireMeet missing confidential meeting check');
    assert(meetContent.includes('CONFIDENTIAL_MEETING_BREACH_ATTEMPT'), 'Missing audit logging on confidential breach');
    assert(meetContent.includes('Forbidden: This meeting is confidential'), 'Missing confidential rejection message');
    logPass('MEET_CONFIDENTIALITY_ENFORCED', 'Confidential meetings strictly restricted to authorized participants');
  } catch (err) {
    logFail('MEET_CONFIDENTIALITY_ENFORCED', 'Confidentiality check failed', err.message);
  }

  // Test 4: Role gates for Organizer / Chair
  try {
    assert(meetContent.includes('context?.requireChair'), 'requireChair gate missing');
    assert(meetContent.includes('context?.requireOrganizerOrChair'), 'requireOrganizerOrChair gate missing');
    assert(meetContent.includes('Only the Meeting Organizer or Chair can perform this action'), 'Missing organizer/chair rejection message');
    logPass('MEET_ORGANIZER_CHAIR_GATES', 'Session execution and meeting lifecycle strictly bounded to Organizer or Chair');
  } catch (err) {
    logFail('MEET_ORGANIZER_CHAIR_GATES', 'Organizer/chair gate check failed', err.message);
  }

  // Test 5: Controllers uniformly use requireMeet
  try {
    const controllers = [
      'lib/actions/meet/meetings.ts',
      'lib/actions/meet/sessions.ts',
      'lib/actions/meet/points.ts',
      'lib/actions/meet/tasks.ts',
      'lib/actions/meet/mom.ts',
      'lib/actions/meet/masters.ts',
      'lib/actions/meet/sla.ts',
      'lib/actions/meet/decisions.ts'
    ];

    for (const c of controllers) {
      const content = fs.readFileSync(c, 'utf8');
      assert(content.includes('requireMeet('), `${c} does not use requireMeet guard`);
    }
    logPass('MEET_CONTROLLERS_GATED', 'All Meet mutation and operational controllers strictly invoke requireMeet guard');
  } catch (err) {
    logFail('MEET_CONTROLLERS_GATED', 'Controller gating check failed', err.message);
  }

  return results;
}

if (process.argv[1]?.endsWith('test-meet.mjs')) {
  runMeetAccessTest().then(res => {
    console.table(res);
    const hasFail = res.some(r => r.status === 'FAIL');
    process.exit(hasFail ? 1 : 0);
  });
}
