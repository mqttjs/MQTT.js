/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 * @param {String} [auth] auth attribute of a url.
 * @param {Object} [opts] object to merge the auth attributes into.
 */
module.exports.parseAuthOptions = function(auth, opts) {
  if(auth){
    var matches = auth.match(/^(.+):(.+)$/);
    if(matches) {
      opts.username = matches[1];
      opts.password = matches[2];
    } else {
      opts.username = auth;
    }
  }
};