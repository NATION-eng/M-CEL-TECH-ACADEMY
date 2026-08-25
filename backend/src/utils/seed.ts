import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User.model';
import School from '../models/School.model';
import Department from '../models/Department.model';
import Course from '../models/Course.model';
import { generateSlug } from './generateId';

export const seedSuperAdmin = async (): Promise<void> => {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('⚠️  SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — skipping super admin seed.');
    return;
  }

  const exists = await User.findOne({ email });
  if (exists) return;

  await User.create({
    firstName: process.env.SUPER_ADMIN_FIRST_NAME || 'Super',
    lastName: process.env.SUPER_ADMIN_LAST_NAME || 'Admin',
    email,
    password,
    role: 'super_admin',
    isActive: true,
  });
  console.log(`✅ Super admin seeded: ${email}`);
};

export const seedDefaultAccounts = async (): Promise<void> => {
  const defaultPassword = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe@2025!';

  // Seed Default Instructor
  const instructorEmail = 'instructor@masterviewacademy.com';
  const instructorExists = await User.findOne({ email: instructorEmail });
  if (!instructorExists) {
    const user = await User.create({
      firstName: 'Academy',
      lastName: 'Instructor',
      email: instructorEmail,
      password: defaultPassword,
      role: 'instructor',
      isActive: true,
    });
    const Instructor = (await import('../models/Instructor.model')).default;
    const { generateInstructorId } = await import('./generateId');
    await Instructor.create({
      user: user._id,
      instructorId: generateInstructorId(),
      bio: 'Lead Academy Instructor',
      specializations: ['Full Stack Development', 'AI Engineering'],
    });
    console.log(`✅ Default instructor seeded: ${instructorEmail}`);
  }

  // Seed Default Admin
  const adminEmail = 'admin@masterviewacademy.com';
  const adminExists = await User.findOne({ email: adminEmail });
  if (!adminExists) {
    await User.create({
      firstName: 'Academy',
      lastName: 'Admin',
      email: adminEmail,
      password: defaultPassword,
      role: 'admin',
      isActive: true,
    });
    console.log(`✅ Default admin seeded: ${adminEmail}`);
  }

  // Seed Default Student
  const studentEmail = 'student@masterviewacademy.com';
  const studentExists = await User.findOne({ email: studentEmail });
  if (!studentExists) {
    const user = await User.create({
      firstName: 'Demo',
      lastName: 'Student',
      email: studentEmail,
      password: defaultPassword,
      role: 'student',
      isActive: true,
    });
    const Student = (await import('../models/Student.model')).default;
    const { generateStudentId } = await import('./generateId');
    await Student.create({
      user: user._id,
      studentId: generateStudentId(),
      bio: 'Enrolled Demo Student',
    });
    console.log(`✅ Default student seeded: ${studentEmail}`);
  }
};

/**
 * Seeds the five academy schools/departments/courses described in the PRD,
 * so the curriculum management UI has real structure to work with on first run.
 * Safe to re-run — skips anything that already exists by slug.
 */
export const seedAcademyStructure = async (): Promise<void> => {
  const superAdmin = await User.findOne({ role: 'super_admin' });
  if (!superAdmin) {
    console.warn('⚠️  No super admin found — skipping academy structure seed.');
    return;
  }

  const structure = [
    {
      school: 'School of Software Engineering',
      departments: [
        {
          name: 'Software Development',
          course: {
            title: 'Software Development',
            shortDescription: 'From zero to full-stack engineer in 3 badge levels.',
            description:
              'A comprehensive software development track covering web foundations, frontend development with React, and full stack engineering with Node.js and MongoDB.',
            price: 150000,
            depositPercentage: 60,
            duration: '4-6 months',
            deliveryMode: 'hybrid',
          },
        },
        {
          name: 'Vibe Coding',
          course: {
            title: 'Vibe Coding',
            shortDescription: 'Build real products with AI-assisted development workflows.',
            description:
              'Learn to build production-grade software using AI coding tools, agentic workflows, and modern prompt engineering techniques.',
            price: 80000,
            depositPercentage: 63,
            duration: '3-4 months',
            deliveryMode: 'online',
          },
        },
        {
          name: 'Project Management',
          course: {
            title: 'Project Management',
            shortDescription: 'Master Agile, Scrum, and professional project delivery.',
            description:
              'Learn industry-standard project management methodologies, Agile frameworks, Scrum practices, budgeting, risk management, and toolsets like Jira and Trello.',
            price: 120000,
            depositPercentage: 60,
            duration: '3-4 months',
            deliveryMode: 'hybrid',
          },
        },
      ],
    },
    {
      school: 'School of AI & Data Science',
      departments: [
        {
          name: 'Artificial Intelligence',
          course: {
            title: 'Artificial Intelligence',
            shortDescription: 'Understand and build intelligent systems from the ground up.',
            description:
              'Covers Python, statistics, machine learning engineering, neural networks, and real-world AI application deployment.',
            price: 250000,
            depositPercentage: 60,
            duration: '5-6 months',
            deliveryMode: 'hybrid',
          },
        },
      ],
    },
    {
      school: 'School of Creative Arts',
      departments: [
        {
          name: 'Graphic Design',
          course: {
            title: 'Graphic Design',
            shortDescription: 'Master visual communication, branding, and digital design.',
            description:
              'Covers design principles, brand identity systems, and digital media design using industry-standard tools.',
            price: 100000,
            depositPercentage: 60,
            duration: '3-4 months',
            deliveryMode: 'physical',
          },
        },
        {
          name: 'Video Editing',
          course: {
            title: 'Video Editing',
            shortDescription: 'Professional post-production and content creation skills.',
            description:
              'Covers editing fundamentals, color grading, sound design, and content production for digital platforms.',
            price: 80000,
            depositPercentage: 63,
            duration: '2-3 months',
            deliveryMode: 'physical',
          },
        },
      ],
    },
  ];

  for (const s of structure) {
    const schoolSlug = generateSlug(s.school);
    let school = await School.findOne({ slug: schoolSlug });
    if (!school) {
      school = await School.create({
        name: s.school,
        slug: schoolSlug,
        isActive: true,
        createdBy: superAdmin._id,
      });
      console.log(`✅ School seeded: ${s.school}`);
    }

    for (const d of s.departments) {
      const deptSlug = generateSlug(d.name);
      let dept = await Department.findOne({ school: school._id, slug: deptSlug });
      if (!dept) {
        dept = await Department.create({
          name: d.name,
          slug: deptSlug,
          school: school._id,
          isActive: true,
          createdBy: superAdmin._id,
        });
        console.log(`  ✅ Department seeded: ${d.name}`);
      }

      const courseSlug = generateSlug(d.course.title);
      const existingCourse = await Course.findOne({ slug: courseSlug });
      if (!existingCourse) {
        const depositAmount = Math.ceil((d.course.price * d.course.depositPercentage) / 100);
        await Course.create({
          ...d.course,
          slug: courseSlug,
          department: dept._id,
          depositAmount,
          isPublished: true,
          createdBy: superAdmin._id,
        });
        console.log(`    ✅ Course seeded: ${d.course.title}`);
      }
    }
  }
};

export const runSeed = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set.');
  await mongoose.connect(uri);
  await seedSuperAdmin();
  await seedDefaultAccounts();
  await seedAcademyStructure();
  await mongoose.disconnect();
  console.log('🌱 Seed complete.');
};

// Allow running directly via `npm run seed`
if (require.main === module) {
  runSeed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
