'use strict';
/*eslint no-unused-expressions:0*/
/*jshint expr:true*/

/**
 * Validate a topic to see if it's valid or not.
 * A topic is valid if it follow below rules:
 * - Rule #1: If any part of the topic is not `+` or `#`, then it must not contain `+` and '#'
 * - Rule #2: Part `#` must be located at the end of the mailbox
 *
 * @param {String} topic - A topic
 * @returns {Boolean} If the topic is valid, returns true. Otherwise, returns false.
 */
function validateTopic (topic) {
  var parts = topic.split('/'),
    i = 0;

  for (i = 0; i < parts.length; i++) {
    if ('+' === parts[i]) {
      continue;
    }

    if ('#' === parts[i] ) {
      // for Rule #2
      return i === parts.length - 1;
    }

    if ( -1 !== parts[i].indexOf('+') || -1 !== parts[i].indexOf('#')) {
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
function validateTopics (topics) {
  for (var i = 0; i < topics.length; i++) {
    if ( !validateTopic(topics[i]) ) {
      return topics[i];
    }
  }
  return null;
}

module.exports = {
  validateTopics: validateTopics
};
