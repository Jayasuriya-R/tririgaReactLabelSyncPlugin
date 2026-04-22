// src/utils/keyGenerator.js
// Converts label strings to SCREAMING_SNAKE_CASE keys
// Also handles deduplication if key already exists

/**
 * Convert "Building Name" to "BUILDING_NAME"
 * For long strings, create shorter meaningful keys
 */
export function toScreamingSnakeCase(str) {
  // For very long strings, extract key words to make shorter keys
  if (str.length > 50) {
    // Take first 3-4 meaningful words
    const words = str.split(/\s+/).filter(word =>
      word.length > 2 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'can', 'this', 'with', 'from'].includes(word.toLowerCase())
    );
    str = words.slice(0, 4).join(' ');
  }

  return str
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, ""); // Remove special chars except underscore
}

/**
 * Deduplicate key if it already exists in the set
 * "BUILDING_NAME" ? "BUILDING_NAME_1", "BUILDING_NAME_2", etc.
 */
export function deduplicateKey(key, existingKeys) {
  if (!existingKeys.has(key)) return key;

  let counter = 1;
  while (existingKeys.has(`${key}_${counter}`)) {
    counter++;
  }
  return `${key}_${counter}`;
}
