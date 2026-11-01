// Unwrap an API response body into a plain array regardless of shape:
//   [...], { data: [...] }, or { message, data: { data: [...], current_page } }
// (Laravel paginator). Returns [] so callers never receive undefined/null or a
// non-array object that would break .filter()/.map() calls.
export const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  return [];
};