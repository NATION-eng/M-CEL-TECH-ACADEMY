import { Response } from 'express';
import School from '../models/School.model';
import Department from '../models/Department.model';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { generateSlug } from '../utils/generateId';

// ─── Schools ────────────────────────────────────────────────────────────────
export const getSchools = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schools = await School.find().sort({ name: 1 });
    sendSuccess(res, schools, 'Schools fetched.');
  } catch {
    sendError(res, 'Could not fetch schools.', 500);
  }
};

export const createSchool = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, icon } = req.body;
    if (!name) {
      sendError(res, 'School name is required.', 400);
      return;
    }
    const school = await School.create({
      name,
      slug: generateSlug(name),
      description,
      icon,
      createdBy: req.user!._id,
    });
    sendSuccess(res, school, 'School created.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create school.', 500);
  }
};

export const updateSchool = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, icon, isActive } = req.body;
    const update: Record<string, unknown> = { description, icon, isActive };
    if (name) {
      update.name = name;
      update.slug = generateSlug(name);
    }
    const school = await School.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!school) {
      sendError(res, 'School not found.', 404);
      return;
    }
    sendSuccess(res, school, 'School updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update school.', 500);
  }
};

export const deleteSchool = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hasDepartments = await Department.exists({ school: req.params.id });
    if (hasDepartments) {
      sendError(res, 'Cannot delete a school that has departments. Remove departments first.', 409);
      return;
    }
    const school = await School.findByIdAndDelete(req.params.id);
    if (!school) {
      sendError(res, 'School not found.', 404);
      return;
    }
    sendSuccess(res, null, 'School deleted.');
  } catch {
    sendError(res, 'Could not delete school.', 500);
  }
};

// ─── Departments ────────────────────────────────────────────────────────────
export const getDepartments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.school) filter.school = req.query.school;
    const departments = await Department.find(filter).populate('school', 'name slug').sort({ name: 1 });
    sendSuccess(res, departments, 'Departments fetched.');
  } catch {
    sendError(res, 'Could not fetch departments.', 500);
  }
};

export const createDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, school, description } = req.body;
    if (!name || !school) {
      sendError(res, 'Department name and school are required.', 400);
      return;
    }
    const department = await Department.create({
      name,
      slug: generateSlug(name),
      school,
      description,
      createdBy: req.user!._id,
    });
    sendSuccess(res, department, 'Department created.', 201);
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not create department.', 500);
  }
};

export const updateDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, isActive } = req.body;
    const update: Record<string, unknown> = { description, isActive };
    if (name) {
      update.name = name;
      update.slug = generateSlug(name);
    }
    const department = await Department.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!department) {
      sendError(res, 'Department not found.', 404);
      return;
    }
    sendSuccess(res, department, 'Department updated.');
  } catch (err) {
    sendError(res, err instanceof Error ? err.message : 'Could not update department.', 500);
  }
};

export const deleteDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      sendError(res, 'Department not found.', 404);
      return;
    }
    sendSuccess(res, null, 'Department deleted.');
  } catch {
    sendError(res, 'Could not delete department.', 500);
  }
};
