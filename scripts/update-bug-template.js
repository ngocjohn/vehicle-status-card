/* eslint-disable */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Paths
const bugTemplatePath = path.join(__dirname, '../.github/ISSUE_TEMPLATE/BUG_REPORT.yml');

// GitHub API details
const GITHUB_REPO = 'ngocjohn/vehicle-status-card'; // Replace with your GitHub repository in "owner/repo" format

// Fetch the list of release tags from GitHub
const getReleasesTags = async () => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${GITHUB_REPO}/releases`);
    return response.data.map((release) => release.tag_name);
  } catch (error) {
    console.error('Error fetching release tags:', error.message);
    return null; // Return null instead of exiting
  }
};

// Update the bug template with the fetched release tags
const updateBugTemplate = async () => {
  try {
    const tags = await getReleasesTags();

    // Read the existing bug template content
    const bugTemplate = fs.readFileSync(bugTemplatePath, 'utf8');

    // If fetching tags failed, skip updating the options
    if (!tags) {
      console.warn('Skipping bug report template update due to failed tag fetch.');
      return;
    }

    // Replace the existing dropdown options
    const updatedTemplate = bugTemplate.replace(
      /options:\n([\s\S]*?)\n\s+validations:/,
      `options:\n${tags.map((tag) => `        - ${tag}`).join('\n')}\n    validations:`
    );

    // Write the updated content back to the file
    fs.writeFileSync(bugTemplatePath, updatedTemplate, 'utf8');
    console.log('Bug report template updated successfully!');
  } catch (error) {
    console.error('Error updating the bug report template:', error.message);
  }
};

// Run the update
updateBugTemplate();
