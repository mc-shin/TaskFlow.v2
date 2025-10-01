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
    // username이 null이면 email에서 생성
    const username = user.username || user.email.split('@')[0];
    // initials가 null이면 name의 첫 글자 사용
    const initials = user.initials || user.name.substring(0, 1);
    
    await sql`
      INSERT INTO users (id, username, email, password, name, initials, role, last_login_at)
      VALUES (${user.id}, ${username}, ${user.email}, ${user.password}, ${user.name}, ${initials}, ${user.role}, ${user.lastLoginAt || user.last_login_at})
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        initials = EXCLUDED.initials,
        role = EXCLUDED.role,
        last_login_at = EXCLUDED.last_login_at
    `;
  }
  console.log(`   ✓ Users: ${data.users.length}개 삽입`);

  // Projects
  for (const project of data.projects) {
    await sql`
      INSERT INTO projects (
        id, name, code, description, deadline, status, labels, owner_ids, 
        is_archived, created_by, last_updated_by, created_at, updated_at
      )
      VALUES (
        ${project.id}, ${project.name}, ${project.code || 'PROJ-' + project.id.substring(0, 4)}, 
        ${project.description}, ${project.deadline}, ${project.status}, 
        ${project.labels || project.label || []}, ${project.ownerIds || project.owner_ids || []}, 
        ${project.isArchived || project.is_archived || false},
        ${project.createdBy || project.created_by}, ${project.lastUpdatedBy || project.last_updated_by}, 
        ${project.createdAt || project.created_at}, ${project.updatedAt || project.updated_at}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        description = EXCLUDED.description,
        deadline = EXCLUDED.deadline,
        status = EXCLUDED.status,
        labels = EXCLUDED.labels,
        owner_ids = EXCLUDED.owner_ids,
        is_archived = EXCLUDED.is_archived,
        created_by = EXCLUDED.created_by,
        last_updated_by = EXCLUDED.last_updated_by,
        updated_at = EXCLUDED.updated_at
    `;
  }
  console.log(`   ✓ Projects: ${data.projects.length}개 삽입`);

  // Goals
  for (const goal of data.goals) {
    await sql`
      INSERT INTO goals (
        id, title, description, deadline, status, labels, assignee_ids, 
        project_id, is_archived, created_by, last_updated_by, created_at, updated_at
      )
      VALUES (
        ${goal.id}, ${goal.title || goal.name}, ${goal.description}, ${goal.deadline}, 
        ${goal.status}, ${goal.labels || goal.label || []}, ${goal.assigneeIds || goal.assignee_ids || []},
        ${goal.projectId || goal.project_id}, ${goal.isArchived || goal.is_archived || false}, 
        ${goal.createdBy || goal.created_by}, ${goal.lastUpdatedBy || goal.last_updated_by}, 
        ${goal.createdAt || goal.created_at}, ${goal.updatedAt || goal.updated_at}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        deadline = EXCLUDED.deadline,
        status = EXCLUDED.status,
        labels = EXCLUDED.labels,
        assignee_ids = EXCLUDED.assignee_ids,
        project_id = EXCLUDED.project_id,
        is_archived = EXCLUDED.is_archived,
        created_by = EXCLUDED.created_by,
        last_updated_by = EXCLUDED.last_updated_by,
        updated_at = EXCLUDED.updated_at
    `;
  }
  console.log(`   ✓ Goals: ${data.goals.length}개 삽입`);

  // Tasks
  for (const task of data.tasks) {
    await sql`
      INSERT INTO tasks (
        id, title, description, status, priority, labels, deadline, duration, progress,
        assignee_ids, goal_id, project_id, is_archived, created_by, last_updated_by, 
        created_at, updated_at
      )
      VALUES (
        ${task.id}, ${task.title}, ${task.description}, ${task.status}, ${task.priority}, 
        ${task.labels || task.label || []}, ${task.deadline || task.dueDate}, ${task.duration || 0}, 
        ${task.progress || 0}, ${task.assigneeIds || task.assignee_ids || (task.assignee ? [task.assignee] : [])}, 
        ${task.goalId || task.goal_id}, ${task.projectId || task.project_id}, ${task.isArchived || task.is_archived || false}, 
        ${task.createdBy || task.created_by}, ${task.lastUpdatedBy || task.last_updated_by}, 
        ${task.createdAt || task.created_at}, ${task.updatedAt || task.updated_at}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        labels = EXCLUDED.labels,
        deadline = EXCLUDED.deadline,
        duration = EXCLUDED.duration,
        progress = EXCLUDED.progress,
        assignee_ids = EXCLUDED.assignee_ids,
        goal_id = EXCLUDED.goal_id,
        project_id = EXCLUDED.project_id,
        is_archived = EXCLUDED.is_archived,
        created_by = EXCLUDED.created_by,
        last_updated_by = EXCLUDED.last_updated_by,
        updated_at = EXCLUDED.updated_at
    `;
  }
  console.log(`   ✓ Tasks: ${data.tasks.length}개 삽입`);

  // Activities
  for (const activity of data.activities) {
    await sql`
      INSERT INTO activities (id, description, user_id, task_id, created_at)
      VALUES (
        ${activity.id}, ${activity.description}, 
        ${activity.userId || activity.user_id}, ${activity.taskId || activity.task_id}, 
        ${activity.createdAt || activity.created_at}
      )
      ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        user_id = EXCLUDED.user_id,
        task_id = EXCLUDED.task_id
    `;
  }
  console.log(`   ✓ Activities: ${data.activities.length}개 삽입`);

  // Meetings
  for (const meeting of data.meetings) {
    await sql`
      INSERT INTO meetings (
        id, title, description, start_at, end_at, type, location, 
        attendee_ids, created_at, updated_at
      )
      VALUES (
        ${meeting.id}, ${meeting.title}, ${meeting.description}, 
        ${meeting.startAt || meeting.start_at || meeting.startTime}, 
        ${meeting.endAt || meeting.end_at || meeting.endTime},
        ${meeting.type || 'standup'}, ${meeting.location},
        ${meeting.attendeeIds || meeting.attendee_ids || meeting.attendees || []},
        ${meeting.createdAt || meeting.created_at}, ${meeting.updatedAt || meeting.updated_at}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        start_at = EXCLUDED.start_at,
        end_at = EXCLUDED.end_at,
        type = EXCLUDED.type,
        location = EXCLUDED.location,
        attendee_ids = EXCLUDED.attendee_ids,
        updated_at = EXCLUDED.updated_at
    `;
  }
  console.log(`   ✓ Meetings: ${data.meetings.length}개 삽입`);

  // Invitations
  for (const invitation of data.invitations) {
    await sql`
      INSERT INTO invitations (
        id, inviter_email, invitee_email, role, status, created_at, updated_at
      )
      VALUES (
        ${invitation.id}, 
        ${invitation.inviterEmail || invitation.inviter_email}, 
        ${invitation.inviteeEmail || invitation.invitee_email}, 
        ${invitation.role}, ${invitation.status}, 
        ${invitation.createdAt || invitation.created_at}, 
        ${invitation.updatedAt || invitation.updated_at}
      )
      ON CONFLICT (id) DO UPDATE SET
        inviter_email = EXCLUDED.inviter_email,
        invitee_email = EXCLUDED.invitee_email,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
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
