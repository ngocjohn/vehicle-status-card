const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Paths
const bugTemplatePath = path.join(__dirname, '../.github/ISSUE_TEMPLATE/BUG_REPORT.yml');

// Check if the current tags are different from the new tags
const isDifferent = (currentTags, newTags) => {
  return newTags.some((tag) => !currentTags.includes(tag));
};

module.exports = async ({ github, context }) => {
  const repo = context.repo;
  const releasesList = await github.rest.repos.listReleases({
    owner: repo.owner,
    repo: repo.repo,
  });
  if (releasesList.status !== 200) {
    throw new Error(`Failed to fetch releases: ${releasesList.status}`);
  }

  let tags = releasesList.data.filter((release) => !release.draft).map((release) => release.tag_name);

  tags = tags.slice(0, 10); // Keep only the latest 10 tags

  console.log('Fetched Tags:', tags);

  // update the bug report template if tags have changed

  // Read the current bug report template
  const bugTemplateContent = fs.readFileSync(bugTemplatePath, 'utf8');
  const doc = yaml.load(bugTemplateContent);

  // Find the version dropdown field
  const versionField = doc.body.find((field) => field.id === 'version');

  if (versionField && versionField.attributes && Array.isArray(versionField.attributes.options)) {
    const currentTags = versionField.attributes.options;

    if (!isDifferent(currentTags, tags)) {
      console.log('No changes in tags. Exiting.');
      return;
    }
    console.log('Tags have changed, updating template...');

    // Update the options with the new tags
    versionField.attributes.options = tags;
    // Convert back to YAML
    const newBugTemplateContent = yaml.dump(doc, { lineWidth: -1 });
    // Write
    fs.writeFileSync(bugTemplatePath, newBugTemplateContent, 'utf8');
    console.log('Bug report template updated successfully.');
    return true;
  } else {
    console.log('Version field not found or invalid in the template.');
    return false;
  }
};
