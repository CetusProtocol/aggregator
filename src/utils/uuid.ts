// Copyright 2025 0xBondSui <sugar@cetus.zone>
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Generate a downgraded UUID6 format identifier
 * This creates a time-based identifier with reduced entropy for better compatibility
 * @returns A downgrade_uuid6 string in format: downgrade_xxxxxxxx-xxxx-6xxx-xxxx-xxxxxxxxxxxx
 */
export function generateDowngradeUuid6(): string {
  // Get current timestamp in milliseconds
  const timestamp = Date.now()

  // Convert timestamp to hex (48 bits for UUID6 time_high and time_mid)
  const timestampHex = timestamp.toString(16).padStart(12, "0")

  // Extract time components for UUID6 format
  const timeHigh = timestampHex.substring(0, 8)
  const timeMid = timestampHex.substring(8, 12)

  // Generate random components with reduced entropy for "downgrade"
  const clockSeq = Math.floor(Math.random() * 0x3fff)
    .toString(16)
    .padStart(4, "0")
  const node = Math.floor(Math.random() * 0xffffffffffff)
    .toString(16)
    .padStart(12, "0")

  // Set version to 6 (UUID6) in the time_hi_and_version field
  const versionedTimeHigh = (parseInt(timeHigh, 16) & 0x0fffffff) | 0x60000000
  const versionedTimeHighHex = versionedTimeHigh.toString(16).padStart(8, "0")

  // Set variant bits (10xx) in clock_seq_hi_and_reserved
  const variantClockSeq = (parseInt(clockSeq, 16) & 0x3fff) | 0x8000
  const variantClockSeqHex = variantClockSeq.toString(16).padStart(4, "0")

  // Construct downgrade UUID6
  const uuid6 = [
    versionedTimeHighHex,
    timeMid,
    "6" +
      Math.floor(Math.random() * 0xfff)
        .toString(16)
        .padStart(3, "0"), // Version 6 + random
    variantClockSeqHex,
    node,
  ].join("-")

  return `downgrade_${uuid6}`
}

/**
 * Generate a simplified downgrade UUID6 with timestamp-based components
 * @returns A simplified downgrade_uuid6 string
 */
export function generateSimpleDowngradeUuid6(): string {
  const timestamp = Date.now()
  const randomPart = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")
  const timestampHex = timestamp.toString(16)

  // Create a simplified format: downgrade_timestamp_random
  return `downgrade_${timestampHex}_${randomPart}`
}

/**
 * Validate if a string is a valid downgrade_uuid6 format
 * @param uuid The string to validate
 * @returns true if valid downgrade_uuid6 format
 */
export function isValidDowngradeUuid6(uuid: string): boolean {
  if (!uuid.startsWith("downgrade_")) {
    return false
  }

  const uuidPart = uuid.substring(10) // Remove 'downgrade_' prefix

  // Check standard UUID format: xxxxxxxx-xxxx-6xxx-xxxx-xxxxxxxxxxxx
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-6[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const simpleRegex = /^[0-9a-f]+_[0-9a-f]{6}$/i

  return uuidRegex.test(uuidPart) || simpleRegex.test(uuidPart)
}

/**
 * Extract timestamp from downgrade_uuid6 if possible
 * @param uuid The downgrade_uuid6 string
 * @returns timestamp in milliseconds or null if cannot extract
 */
export function extractTimestampFromDowngradeUuid6(
  uuid: string
): number | null {
  if (!isValidDowngradeUuid6(uuid)) {
    return null
  }

  const uuidPart = uuid.substring(10) // Remove 'downgrade_' prefix

  // Try simple format first
  if (uuidPart.includes("_")) {
    const parts = uuidPart.split("_")
    if (parts.length === 2) {
      const timestamp = parseInt(parts[0], 16)
      return isNaN(timestamp) ? null : timestamp
    }
  }

  // Try standard UUID6 format
  const parts = uuidPart.split("-")
  if (parts.length === 5) {
    try {
      // Extract timestamp from time_high and time_mid
      const timeHigh = (parseInt(parts[0], 16) & 0x0fffffff)
        .toString(16)
        .padStart(8, "0")
      const timeMid = parts[1]
      const timestampHex = timeHigh + timeMid
      const timestamp = parseInt(timestampHex, 16)
      return isNaN(timestamp) ? null : timestamp
    } catch {
      return null
    }
  }

  return null
}
