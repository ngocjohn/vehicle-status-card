const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yaml = require('js-yaml');

// Paths
const bugTemplatePath = path.join(__dirname, '../.github/ISSUE_TEMPLATE/BUG_REPORT.yml');

// GitHub API details
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases`;

// Fetch the latest release tags from GitHub
const getReleasesTags = async () => {
  try {
    const headers = {};

    if (GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }

    const response = await axios.get(RELEASE_API_URL, {
      headers,
    });

    let tags = response.data.filter((release) => !release.draft).map((release) => release.tag_name);

    // only last 10 tags
    tags = tags.slice(0, 10);
    console.log('Fetched release tags:', tags);

    return tags;
  } catch (error) {
    console.error('Error fetching release tags:', error.message);
    return null;
  }
};

// Check if the current tags are different from the new tags
const isDifferent = (currentTags, newTags) => {
  return newTags.some((tag) => !currentTags.includes(tag));
};

// Update the bug template with the fetched release tags
const updateBugTemplate = async () => {
  const tags = await getReleasesTags();
  if (!tags) {
    console.error('No tags fetched, exiting update process.');
    return; // Exit if no tags were fetched
  }
  // Read the existing bug template content
  const bugTemplate = fs.readFileSync(bugTemplatePath, 'utf8');
  const doc = yaml.load(bugTemplate);

  // Find the version dropdown field
  const versionField = doc.body.find((field) => field.id === 'version');

  if (versionField && versionField.attributes && Array.isArray(versionField.attributes.options)) {
    const currentTags = versionField.attributes.options;

    if (!isDifferent(currentTags, tags)) {
      console.log('No changes in tags, bug report template does not need updating.');
      return;
    }

    // Update the versions
    versionField.attributes.options = tags;

    // Convert back to YAML
    const updatedYaml = yaml.dump(doc, { lineWidth: -1 });

    // Write updated YAML to file
    fs.writeFileSync(bugTemplatePath, updatedYaml, 'utf8');
    console.log('Bug report template updated successfully!');
  } else {
    console.error('Version field not found or in unexpected format.');
  }
};

// Run the update
updateBugTemplate();
