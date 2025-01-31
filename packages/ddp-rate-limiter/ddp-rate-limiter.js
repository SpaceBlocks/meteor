import { RateLimiter } from 'meteor/rate-limit';

// Rate Limiter built into DDP with a default error message. See README or
// online documentation for more details.
const DDPRateLimiter = {};

let errorMessage = (rateLimitResult) => {
  return 'Error, too many requests. Please slow down. You must wait ' +
    `${Math.ceil(rateLimitResult.timeToReset / 1000)} seconds before ` +
    'trying again.';
};

// Store rule specific error messages.
const errorMessageByRule = new Map();

const rateLimiter = new RateLimiter();

DDPRateLimiter.getErrorMessage = (rateLimitResult) => {
  // If there is a specific error message for this rule, use it.
  if (errorMessageByRule.has(rateLimitResult.ruleId)) {
    const message = errorMessageByRule.get(rateLimitResult.ruleId);
    // if it's a function, we need to call it
    if (typeof message === 'function') {
      // call the function with the rateLimitResult
      return message(rateLimitResult);
    }
    // otherwise, just return the string
    return message;
 }

  // Otherwise, use the default error message.
  if (typeof errorMessage === 'function') {
    return errorMessage(rateLimitResult);
  }
  return errorMessage;
};

/**
 * @summary Set error message text when method or subscription rate limit
 * exceeded.
 * @param {string|function} message Functions are passed in an object with a
 * `timeToReset` field that specifies the number of milliseconds until the next
 * method or subscription is allowed to run. The function must return a string
 * of the error message.
 * @locus Server
 */
DDPRateLimiter.setErrorMessage = (message) => {
  errorMessage = message;
};

/**
 * @summary Set error message text when method or subscription rate limit
 * exceeded for a specific rule.
 * @param {string} ruleId The ruleId returned from `addRule`
 * @param {string|function} message Functions are passed in an object with a
 * `timeToReset` field that specifies the number of milliseconds until the next
 * method or subscription is allowed to run. The function must return a string
 * of the error message.
 * @locus Server
 */
DDPRateLimiter.setErrorMessageOnRule = (ruleId, message) => {
  errorMessageByRule.set(ruleId, message);
};

/**
 * @summary
 * Add a rule that matches against a stream of events describing method or
 * subscription attempts. Each event is an object with the following
 * properties:
 *
 * - `type`: Either "method" or "subscription"
 * - `name`: The name of the method or subscription being called
 * - `userId`: The user ID attempting the method or subscription
 * - `connectionId`: A string representing the user's DDP connection
 * - `clientAddress`: The IP address of the user
 *
 * Returns unique `ruleId` that can be passed to `removeRule`.
 *
 * @param {Object} matcher
 *   Matchers specify which events are counted towards a rate limit. A matcher
 *   is an object that has a subset of the same properties as the event objects
 *   described above. Each value in a matcher object is one of the following:
 *
 *   - a string: for the event to satisfy the matcher, this value must be equal
 *   to the value of the same property in the event object
 *
 *   - a function: for the event to satisfy the matcher, the function must
 *   evaluate to true when passed the value of the same property
 *   in the event object
 *
 * Here's how events are counted: Each event that satisfies the matcher's
 * filter is mapped to a bucket. Buckets are uniquely determined by the
 * event object's values for all properties present in both the matcher and
 * event objects.
 *
 * @param {number} numRequests  number of requests allowed per time interval.
 * Default = 10.
 * @param {number} timeInterval time interval in milliseconds after which
 * rule's counters are reset. Default = 1000.
 * @param {function} callback function to be called after a rule is executed.
 * @locus Server
 */
DDPRateLimiter.addRule = (matcher, numRequests, timeInterval, callback) => 
  rateLimiter.addRule(matcher, numRequests, timeInterval, callback);

DDPRateLimiter.printRules = () => rateLimiter.rules;

/**
 * @summary Removes the specified rule from the rate limiter. If rule had
 * hit a rate limit, that limit is removed as well.
 * @param  {string} id 'ruleId' returned from `addRule`
 * @return {boolean}    True if a rule was removed.
 * @locus Server
 */
DDPRateLimiter.removeRule = id => rateLimiter.removeRule(id);

// This is accessed inside livedata_server.js, but shouldn't be called by any
// user.
DDPRateLimiter._increment = (input) => {
  rateLimiter.increment(input);
};

DDPRateLimiter._check = input => rateLimiter.check(input);

export { DDPRateLimiter };
