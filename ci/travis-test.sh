#!/usr/bin/env bash
# We use set -e to bail on first non zero exit code of any processes launched
# and -x to exit upon any unbound variable. -x will output command lines used
# (with variable expansion)
set -eux
npm test && node_modules/.bin/codecov

## http://stackoverflow.com/a/13864829
if [ -z ${SAUCE_USERNAME+x} ]; then
  echo 'Not running on saucelabs'
  echo 'https://docs.travis-ci.com/user/pull-requests#Pull-Requests-and-Security-Restrictions'
  echo 'Travis CI makes encrypted variables and data available only to 
        pull requests coming from the same repository. 
        These are considered trustworthy, as only members with 
        write access to the repository can send them.'
else
  npm run sauce-test
fi

# We may as well run the browser build here
npm run prepublish
