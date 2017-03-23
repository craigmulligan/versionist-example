var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
var applyEachSeries = require('async/applyEachSeries');

var getAuthor = (commitHash) => {
  return execSync(`git show --quiet --format="%an" ${commitHash}`, { encoding: 'utf8' }).replace('\n', '');
}

var commit = (cwd, version, callback) => {
  console.log(`Committing...v${version}`);
  exec(`git commit -a -m "v${version}"`, (err, data) => {
    if (err) {
      callback(err);
    }
    console.log('commited')
    callback(null, data);
  });
}

var tag = (cwd, version, callback) => {
  console.log('Tagging...');
  exec(`git tag v${version}`, (err, data) => {
    if (err) {
      callback(err);
    }
    console.log('Tagged')
    callback(null, data);
  });
}

var push = (cwd, version, callback) => {
  console.log('Pushing...');
  exec(`git push --tags`, (err, data) => {
    if (err) {
      callback(err);
    }
    console.log('Pushed')
    callback(null, data);
  });
}

module.exports = {
  // This setup allows the editing and parsing of footer tags to get version and type information,
  // as well as ensuring tags of the type 'v<major>.<minor>.<patch>' are used.
  // It increments in a semver compatible fashion and allows the updating of NPM package info.
  editChangelog: true,
  parseFooterTags: true,
  getGitReferenceFromVersion: 'v-prefix',
  incrementVersion: 'semver',
  updateVersion: (cwd, version, callback) => {
    applyEachSeries([commit, tag, push], cwd, version, (err, data) => {
      if (err) {
        callback(err);
      }
      callback(null, data);
    });
  },

  // Always add the entry to the top of the Changelog, below the header.
  addEntryToChangelog: {
    preset: 'prepend',
    fromLine: 6
  },

  // Only include a commit when there is a footer tag of 'change-type'.
  // Ensures commits which do not up versions are not included.
  includeCommitWhen: (commit) => {
    return !!commit.footer['change-type'];
  },

  // Determine the type from 'change-type:' tag.
  // Should no explicit change type be made, then no changes are assumed.
  getIncrementLevelFromCommit: (commit) => {
    if (commit.footer['change-type']) {
      return commit.footer['change-type'].trim();
    }
  },

  // If a 'changelog-entry' tag is found, use this as the subject rather than the
  // first line of the commit.
  transformTemplateData: (data) => {
    data.commits.forEach((commit) => {
      commit.subject = commit.footer['changelog-entry'] || commit.subject;
      commit.author = getAuthor(commit.hash);
    });

    return data;
  },

  template: [
    '## v{{version}} - {{moment date "Y-MM-DD"}}',
    '',
    '{{#each commits}}',
    '{{#if this.author}}',
    '* {{capitalize this.subject}} [{{this.author}}]',
    '{{else}}',
    '* {{capitalize this.subject}}',
    '{{/if}}',
    '{{/each}}'
  ].join('\n')
};
