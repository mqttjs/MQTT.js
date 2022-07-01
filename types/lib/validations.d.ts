declare export namespace validations {
    /**
     * Validate the parts of a topic to see if it's valid or not.
     * 
     * @see {validateTopic}
     * @param {string[]} parts 
     * @returns {boolean} If the topic is valid, returns true. Otherwise, returns false.
     */
    function validateTopicParts(parts: string[]) : boolean

    /**
     * Validate a topic to see if it's valid or not.
     * A topic is valid if it follow below rules:
     * - Rule #1: If any part of the topic is not `+` or `#`, then it must not contain `+` and '#'
     * - Rule #2: Part `#` must be located at the end of the mailbox
     *
     * @param {string} topic - A topic
     * @returns {boolean} If the topic is valid, returns true. Otherwise, returns false.
     */
    function validateTopic(topic: string) : boolean

    /**
     * Validate an array of topics to see if any of them is valid or not
     * @param {string[]} topics - Array of topics
     * @returns {'empty_topic_list' | string | null} If the topics is valid, returns null. Otherwise, returns the invalid one
     */
    function validateTopics(topics: string[]) : 'empty_topic_list' | string | null
}