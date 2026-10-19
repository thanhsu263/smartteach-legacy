import type { SupabaseClient } from "@supabase/supabase-js";
import { describeDbError } from "@/lib/classes/errors";
import { MAX_CLASSES, MAX_NAME_LENGTH, MAX_STUDENTS_PER_CLASS } from "@/lib/classes/limits";

export type ClassSummary = { id: string; name: string; studentCount: number };
export type Student = { id: string; name: string; position: number };

export type Result<T> = ({ ok: true } & T) | { ok: false; message: string };

function fail(error: { code?: string; message?: string } | null | undefined): { ok: false; message: string } {
  return { ok: false, message: describeDbError(error) };
}

/** Kiểm tra tên lớp ở phía giao diện để báo lỗi sớm; giới hạn thật do cơ sở dữ liệu ép. */
export function validateName(raw: string): string | null {
  const name = raw.trim();
  if (name === "") return "Thầy cô nhập tên trước nhé.";
  if (name.length > MAX_NAME_LENGTH) return `Tên tối đa ${MAX_NAME_LENGTH} ký tự.`;
  return null;
}

/** Kiểm tra danh sách tên học sinh; trả về lời nhắn lỗi hoặc null. */
export function validateStudentNames(names: readonly string[], existing = 0): string | null {
  if (existing + names.length > MAX_STUDENTS_PER_CLASS) {
    return `Một lớp chứa tối đa ${MAX_STUDENTS_PER_CLASS} học sinh (hiện có ${existing}, đang thêm ${names.length}).`;
  }
  const tooLong = names.find((name) => name.length > MAX_NAME_LENGTH);
  if (tooLong) return `Có tên dài quá ${MAX_NAME_LENGTH} ký tự: “${tooLong.slice(0, 24)}…”.`;
  return null;
}

export async function listClasses(supabase: SupabaseClient): Promise<Result<{ classes: ClassSummary[] }>> {
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, students(count)")
    .order("created_at", { ascending: false });
  if (error || !data) return fail(error);
  return {
    ok: true,
    classes: data.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      studentCount: (row.students as { count: number }[] | null)?.[0]?.count ?? 0,
    })),
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Id lớp lấy từ URL có thể là chuỗi bất kỳ; chuỗi không phải UUID chắc chắn không phải lớp nào. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export async function getClass(
  supabase: SupabaseClient,
  id: string,
): Promise<Result<{ found: boolean; name: string; students: Student[] }>> {
  if (!isUuid(id)) return { ok: true, found: false, name: "", students: [] };
  const classRow = await supabase.from("classes").select("id, name").eq("id", id).maybeSingle();
  if (classRow.error) return fail(classRow.error);
  if (!classRow.data) return { ok: true, found: false, name: "", students: [] };
  const students = await listStudents(supabase, id);
  if (!students.ok) return students;
  return { ok: true, found: true, name: classRow.data.name as string, students: students.students };
}

export async function listStudents(
  supabase: SupabaseClient,
  classId: string,
): Promise<Result<{ students: Student[] }>> {
  const { data, error } = await supabase
    .from("students")
    .select("id, name, position")
    .eq("class_id", classId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !data) return fail(error);
  return {
    ok: true,
    students: data.map((row) => ({ id: row.id as string, name: row.name as string, position: row.position as number })),
  };
}

export async function createClass(
  supabase: SupabaseClient,
  name: string,
  studentNames: readonly string[],
): Promise<Result<{ id: string }>> {
  const nameError = validateName(name);
  if (nameError) return { ok: false, message: nameError };
  const studentsError = validateStudentNames(studentNames);
  if (studentsError) return { ok: false, message: studentsError };

  // Một lần gọi, một giao dịch: lỗi ở học sinh thì lớp cũng không được tạo.
  const { data, error } = await supabase.rpc("create_class_with_students", {
    class_name: name.trim(),
    student_names: studentNames,
  });
  if (error || typeof data !== "string") return fail(error);
  return { ok: true, id: data };
}

export async function renameClass(supabase: SupabaseClient, id: string, name: string): Promise<Result<object>> {
  const nameError = validateName(name);
  if (nameError) return { ok: false, message: nameError };
  const { error } = await supabase.from("classes").update({ name: name.trim() }).eq("id", id);
  return error ? fail(error) : { ok: true };
}

export async function deleteClass(supabase: SupabaseClient, id: string): Promise<Result<object>> {
  const { error } = await supabase.from("classes").delete().eq("id", id);
  return error ? fail(error) : { ok: true };
}

export async function addStudents(
  supabase: SupabaseClient,
  classId: string,
  names: readonly string[],
  existing: readonly Student[],
): Promise<Result<object>> {
  const problem = validateStudentNames(names, existing.length);
  if (problem) return { ok: false, message: problem };
  const start = existing.reduce((max, student) => Math.max(max, student.position + 1), 0);
  const { error } = await supabase
    .from("students")
    .insert(names.map((name, index) => ({ class_id: classId, name, position: start + index })));
  return error ? fail(error) : { ok: true };
}

export async function renameStudent(supabase: SupabaseClient, id: string, name: string): Promise<Result<object>> {
  const nameError = validateName(name);
  if (nameError) return { ok: false, message: nameError };
  const { error } = await supabase.from("students").update({ name: name.trim() }).eq("id", id);
  return error ? fail(error) : { ok: true };
}

export async function deleteStudent(supabase: SupabaseClient, id: string): Promise<Result<object>> {
  const { error } = await supabase.from("students").delete().eq("id", id);
  return error ? fail(error) : { ok: true };
}

export { MAX_CLASSES };
