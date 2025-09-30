import { neon } from '@neondatabase/serverless';

interface MigrationData {
  users: any[];
  projects: any[];
  goals: any[];
  tasks: any[];
  activities: any[];
  meetings: any[];
  invitations: any[];
}

async function exportData(sourceDbUrl: string): Promise<MigrationData> {
  console.log('📤 Development DB에서 데이터 추출 중...');
  const sql = neon(sourceDbUrl);

  const users = await sql`SELECT * FROM users ORDER BY id`;
  const projects = await sql`SELECT * FROM projects ORDER BY id`;
  const goals = await sql`SELECT * FROM goals ORDER BY id`;
  const tasks = await sql`SELECT * FROM tasks ORDER BY id`;
  const activities = await sql`SELECT * FROM activities ORDER BY id`;
  const meetings = await sql`SELECT * FROM meetings ORDER BY id`;
  const invitations = await sql`SELECT * FROM invitations ORDER BY id`;

  console.log(`✅ 추출 완료:`);
  console.log(`   - Users: ${users.length}개`);
  console.log(`   - Projects: ${projects.length}개`);
  console.log(`   - Goals: ${goals.length}개`);
  console.log(`   - Tasks: ${tasks.length}개`);
  console.log(`   - Activities: ${activities.length}개`);
  console.log(`   - Meetings: ${meetings.length}개`);
  console.log(`   - Invitations: ${invitations.length}개`);

  return { users, projects, goals, tasks, activities, meetings, invitations };
}

async function importData(targetDbUrl: string, data: MigrationData) {
  console.log('\n📥 Production DB로 데이터 삽입 중...');
  const sql = neon(targetDbUrl);

  // 기존 데이터 삭제 (역순으로)
  console.log('🗑️  기존 데이터 삭제 중...');
  await sql`DELETE FROM invitations`;
  await sql`DELETE FROM meetings`;
  await sql`DELETE FROM activities`;
  await sql`DELETE FROM tasks`;
  await sql`DELETE FROM goals`;
  await sql`DELETE FROM projects`;
  await sql`DELETE FROM users`;

  // 새 데이터 삽입
  console.log('📝 새 데이터 삽입 중...');

  // Users
  for (const user of data.users) {
    await sql`
      INSERT INTO users (id, email, password, name, role)
      VALUES (${user.id}, ${user.email}, ${user.password}, ${user.name}, ${user.role})
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        role = EXCLUDED.role
    `;
  }
  console.log(`   ✓ Users: ${data.users.length}개 삽입`);

  // Projects
  for (const project of data.projects) {
    await sql`
      INSERT INTO projects (id, name, description, status, progress, "userId")
      VALUES (${project.id}, ${project.name}, ${project.description}, ${project.status}, ${project.progress}, ${project.userId})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        progress = EXCLUDED.progress,
        "userId" = EXCLUDED."userId"
    `;
  }
  console.log(`   ✓ Projects: ${data.projects.length}개 삽입`);

  // Goals
  for (const goal of data.goals) {
    await sql`
      INSERT INTO goals (id, name, description, status, progress, "projectId")
      VALUES (${goal.id}, ${goal.name}, ${goal.description}, ${goal.status}, ${goal.progress}, ${goal.projectId})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        progress = EXCLUDED.progress,
        "projectId" = EXCLUDED."projectId"
    `;
  }
  console.log(`   ✓ Goals: ${data.goals.length}개 삽입`);

  // Tasks
  for (const task of data.tasks) {
    await sql`
      INSERT INTO tasks (id, title, description, status, priority, progress, "assignee", "dueDate", "goalId")
      VALUES (
        ${task.id}, 
        ${task.title}, 
        ${task.description}, 
        ${task.status}, 
        ${task.priority}, 
        ${task.progress}, 
        ${task.assignee}, 
        ${task.dueDate}, 
        ${task.goalId}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        progress = EXCLUDED.progress,
        assignee = EXCLUDED.assignee,
        "dueDate" = EXCLUDED."dueDate",
        "goalId" = EXCLUDED."goalId"
    `;
  }
  console.log(`   ✓ Tasks: ${data.tasks.length}개 삽입`);

  // Activities
  for (const activity of data.activities) {
    await sql`
      INSERT INTO activities (id, type, description, "userId", "taskId", "createdAt")
      VALUES (${activity.id}, ${activity.type}, ${activity.description}, ${activity.userId}, ${activity.taskId}, ${activity.createdAt})
      ON CONFLICT (id) DO UPDATE SET
        type = EXCLUDED.type,
        description = EXCLUDED.description,
        "userId" = EXCLUDED."userId",
        "taskId" = EXCLUDED."taskId",
        "createdAt" = EXCLUDED."createdAt"
    `;
  }
  console.log(`   ✓ Activities: ${data.activities.length}개 삽입`);

  // Meetings
  for (const meeting of data.meetings) {
    await sql`
      INSERT INTO meetings (
        id, title, description, "startTime", "endTime", 
        attendees, location, "attachmentUrls", "createdBy"
      )
      VALUES (
        ${meeting.id}, ${meeting.title}, ${meeting.description}, 
        ${meeting.startTime}, ${meeting.endTime},
        ${meeting.attendees}, ${meeting.location}, 
        ${meeting.attachmentUrls}, ${meeting.createdBy}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        "startTime" = EXCLUDED."startTime",
        "endTime" = EXCLUDED."endTime",
        attendees = EXCLUDED.attendees,
        location = EXCLUDED.location,
        "attachmentUrls" = EXCLUDED."attachmentUrls",
        "createdBy" = EXCLUDED."createdBy"
    `;
  }
  console.log(`   ✓ Meetings: ${data.meetings.length}개 삽입`);

  // Invitations
  for (const invitation of data.invitations) {
    await sql`
      INSERT INTO invitations (id, "inviterEmail", "inviteeEmail", role, status)
      VALUES (${invitation.id}, ${invitation.inviterEmail}, ${invitation.inviteeEmail}, ${invitation.role}, ${invitation.status})
      ON CONFLICT (id) DO UPDATE SET
        "inviterEmail" = EXCLUDED."inviterEmail",
        "inviteeEmail" = EXCLUDED."inviteeEmail",
        role = EXCLUDED.role,
        status = EXCLUDED.status
    `;
  }
  console.log(`   ✓ Invitations: ${data.invitations.length}개 삽입`);

  console.log('\n✅ 마이그레이션 완료!');
}

async function migrate(sourceDbUrl: string, targetDbUrl: string) {
  try {
    console.log('🚀 데이터베이스 마이그레이션 시작\n');
    console.log(`📍 Source (Development): ${sourceDbUrl.substring(0, 30)}...`);
    console.log(`📍 Target (Production): ${targetDbUrl.substring(0, 30)}...`);
    console.log('');

    const data = await exportData(sourceDbUrl);
    await importData(targetDbUrl, data);

    console.log('\n🎉 모든 작업이 성공적으로 완료되었습니다!');
  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
    process.exit(1);
  }
}

// CLI 실행
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log('사용법: npm run migrate <개발DB_URL> <프로덕션DB_URL>');
  console.log('');
  console.log('예시:');
  console.log('npm run migrate \\');
  console.log('  "postgresql://user:pass@dev.db.com/db" \\');
  console.log('  "postgresql://user:pass@prod.db.com/db"');
  process.exit(1);
}

const [sourceDbUrl, targetDbUrl] = args;
migrate(sourceDbUrl, targetDbUrl);
