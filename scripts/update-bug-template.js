const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Paths
const bugTemplatePath = path.join(__dirname, '../.github/ISSUE_TEMPLATE/BUG_REPORT.yml');

// GitHub API details
const GITHUB_REPO = 'ngocjohn/vehicle-status-card';
const RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases`;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Fetch the latest release tags from GitHub
const getReleasesTags = async () => {
  try {
    const headers = {};

    if (GITHUB_TOKEN) {
      console.log('Using GitHub token for authentication');
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

// Update the bug template with the fetched release tags
const updateBugTemplate = async () => {
  const tags = await getReleasesTags();
  if (!tags) {
    console.error('No tags fetched, exiting update process.');
    return; // Exit if no tags were fetched
  }
  // Read the existing bug template content
  const bugTemplate = fs.readFileSync(bugTemplatePath, 'utf8');

  // Replace the existing dropdown options
  const updatedTemplate = bugTemplate.replace(
    /options:\n([\s\S]*?)\n\s+validations:/,
    `options:\n${tags.map((tag) => `        - ${tag}`).join('\n')}\n    validations:`
  );

  // Write the updated content back to the file
  fs.writeFileSync(bugTemplatePath, updatedTemplate, 'utf8');
  console.log('Bug report template updated successfully!');
};

// Run the update
updateBugTemplate();
