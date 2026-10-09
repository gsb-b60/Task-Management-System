// Sample data for a fresh database (Phase 00 §10).
//
// Dates are relative to the day the seed runs, so the overdue, due-today, and
// upcoming fixtures stay meaningful on every machine and every day — a
// hard-coded date would quietly stop being overdue and leave Phase 04's
// dashboard with nothing to show.
import { PrismaClient, TaskPriority, TaskStatus } from "@prisma/client";
import { hashPassword } from "../src/service/password.js";

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day at UTC midnight — the API's date-only representation. */
function dayOffset(days: number): Date {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return new Date(
    Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()),
  );
}

async function main() {
  console.log("Seeding database...");

  // Children cascade from User, but delete in dependency order anyway so the
  // seed is explicit about what it owns.
  await prisma.task.deleteMany();
  await prisma.gitHubRepository.deleteMany();
  await prisma.project.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const demoUser = await prisma.user.create({
    data: {
      email: "demo@example.com",
      // bcrypt hash of "password123", generated with the app's own cost factor
      passwordHash: hashPassword("password123"),
      displayName: "Demo User",
    },
  });
  console.log(`Created demo user: ${demoUser.email} (${demoUser.id})`);

  // A second account proves per-user isolation: their tasks must never appear
  // in the demo user's lists, counts, or dashboard.
  const otherUser = await prisma.user.create({
    data: {
      email: "other@example.com",
      passwordHash: hashPassword("password123"),
      displayName: "Other User",
    },
  });

  const portfolio = await prisma.project.create({
    data: {
      name: "Portfolio Website",
      description: "Personal portfolio website built with React and Tailwind CSS",
      startDate: dayOffset(-14),
      targetDate: dayOffset(30),
      userId: demoUser.id,
    },
  });

  const manager = await prisma.project.create({
    data: {
      name: "Git Project Manager",
      description: "Personal project-management application with GitHub integration",
      startDate: dayOffset(-10),
      targetDate: dayOffset(60),
      userId: demoUser.id,
    },
  });

  console.log(`Created projects: ${portfolio.name}, ${manager.name}`);

  type SeedTask = {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    startDate?: Date;
    dueDate?: Date;
    projectId?: string;
  };

  // Every status and every priority appears at least once; the due dates span
  // overdue, due today, due tomorrow, next week, and no deadline at all.
  const tasks: SeedTask[] = [
    {
      title: "Set up project scaffolding",
      description: "Initialize backend with Express and TypeScript",
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      startDate: dayOffset(-14),
      dueDate: dayOffset(-12),
      projectId: portfolio.id,
    },
    {
      title: "Design database schema",
      description: "Create Prisma schema with all models and relations",
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      startDate: dayOffset(-13),
      dueDate: dayOffset(-10),
      projectId: portfolio.id,
    },
    {
      title: "Configure GitHub OAuth app",
      description: "Set up client ID and secret in developer settings",
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      dueDate: dayOffset(-5),
      projectId: manager.id,
    },
    {
      title: "Fix login redirect bug",
      description: "Users land on dashboard after re-authentication",
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      startDate: dayOffset(-6),
      dueDate: dayOffset(-4), // overdue
      projectId: manager.id,
    },
    {
      title: "Write API documentation",
      description: "Document every route with request and response examples",
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: dayOffset(0), // due today
      projectId: manager.id,
    },
    {
      title: "Implement authentication endpoints",
      description: "Register, login, logout, me, and session middleware",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      startDate: dayOffset(-5),
      dueDate: dayOffset(1), // due tomorrow
      projectId: manager.id,
    },
    {
      title: "Build Kanban Board UI",
      description: "Drag and drop task columns for TODO, IN_PROGRESS, DONE",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      startDate: dayOffset(-3),
      dueDate: dayOffset(7),
      projectId: manager.id,
    },
    {
      title: "Deploy backend to Docker",
      description: "Write Dockerfile and docker-compose.yml configuration",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.LOW,
      startDate: dayOffset(-2),
      dueDate: dayOffset(9),
    },
    {
      title: "Add dark mode support",
      description: "Support system preferences and user toggle",
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      projectId: portfolio.id,
    },
    {
      title: "Write unit tests for auth service",
      description: "Cover password hashing, token generation, constant-time verify",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: dayOffset(16),
      projectId: manager.id,
    },
    {
      title: "Set up CI/CD pipeline",
      description: "Automated linting, typechecking, and testing with GitHub Actions",
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      dueDate: dayOffset(23),
    },
    {
      title: "Review homepage mockups",
      description: "Compare the three proposed layouts against the brief",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      dueDate: dayOffset(30),
      projectId: portfolio.id,
    },
  ];

  await prisma.task.createMany({
    data: tasks.map((task) => ({ ...task, userId: demoUser.id })),
  });

  await prisma.task.createMany({
    data: [
      {
        title: "Other user's private task",
        description: "Must never appear in the demo account's data",
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: dayOffset(-1),
        userId: otherUser.id,
      },
      {
        title: "Other user's completed task",
        description: "Must never inflate the demo account's counts",
        status: TaskStatus.DONE,
        priority: TaskPriority.LOW,
        userId: otherUser.id,
      },
    ],
  });

  // Phase 02 §8: prove the fixture covers every enum value before declaring
  // the seed finished.
  const statuses = new Set(tasks.map((task) => task.status));
  const priorities = new Set(tasks.map((task) => task.priority));
  for (const status of Object.values(TaskStatus)) {
    if (!statuses.has(status)) throw new Error(`Seed is missing status ${status}`);
  }
  for (const priority of Object.values(TaskPriority)) {
    if (!priorities.has(priority)) throw new Error(`Seed is missing priority ${priority}`);
  }

  console.log(`Seeded ${tasks.length} tasks for ${demoUser.email}.`);
  console.log(`Seeded 2 tasks for ${otherUser.email} (isolation fixture).`);
  console.log("Seeding finished successfully.");
}

main()
  .catch((error) => {
    console.error("Seeding error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
