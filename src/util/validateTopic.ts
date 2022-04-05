/**
 * Validate a topic to see if it's valid or not.
 * Topics can support Multi-level wildcards (‘#’ U+0023) and single-level wildcards (‘+’ U+002B).
 * 
 * The multi-level wildcard character MUST be specified either on its own or following a topic level separator.
 * In either case it MUST be the last character specified in the Topic Filter.
 * 
 * The single-level wildcard character MUST occupy an entire level of the filter.
 * For example: "+" is valid, "+/tennis/#" is valid, "sport+" is not valid.
 * 
 * Topics beginning with $: The Server MUST NOT match Topic Filters starting with a wildcard character with Topic Names
 * 
 * Topic names and topic filters must not include the null character (Unicode U+0000)
 * 
 * Topic names and Topic Filters are UTF-8 encoded strings; they must not encode to more than 65,535 bytes.
 *
 * @param {String} topic - A topic
 * @returns {Boolean} If the topic is valid, returns true. Otherwise, returns false.
 */
export function validateTopic(topic: string) {
  // Topic must be at least 1 character.
  if (topic.length === 0) {
    return false;
  }
  const levels: string[] = topic.split('/');

  for (const [i, level] of levels.entries()) {
    // If SLWC, MUST occupy entire level.
    if (level === '+') {
      continue;
    }

    if (level === '#') {
      // Validate MLWC at end of topic filter.
      return i === levels.length - 1;
    }

    // Level must not contain more than one MLWC or SLWC character.
    if (level.includes('+') || level.includes('#')) {
      return false;
    }
  }
  return true;
}

/**
 * Validate an array of topics to see if any of them is valid or not
 * @param {Array} topics - Array of topics
 * @returns {String} If the topics is valid, returns null. Otherwise, returns the invalid one
 */
export function validateTopics(topics: Array<string>) {
  if (topics.length === 0) {
    return 'empty_topic_list';
  }
  for (let i = 0; i < topics.length; i++) {
    if (!validateTopic(topics[i] as string)) {
      return topics[i];
    }
  }
  return null;
}
