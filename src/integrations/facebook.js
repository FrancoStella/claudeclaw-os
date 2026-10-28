/**
 * Facebook Graph API Integration
 * Posts text, photos, and videos to Facebook Pages
 */

import https from 'https';
import fs from 'fs';
import FormData from 'form-data';

export class FacebookPoster {
  constructor() {
    this.pages = new Map();
    this.loadPages();
  }

  loadPages() {
    // Load pages from environment variables
    let pageNum = 1;
    while (process.env[`FB_PAGE_${pageNum}_ID`]) {
      const page = {
        id: process.env[`FB_PAGE_${pageNum}_ID`],
        name: process.env[`FB_PAGE_${pageNum}_NAME`],
        token: process.env[`FB_PAGE_${pageNum}_TOKEN`],
      };
      this.pages.set(page.name.toLowerCase(), page);
      this.pages.set(page.id, page);
      pageNum++;
    }
  }

  /**
   * List available pages
   */
  listPages() {
    const pages = [];
    const seen = new Set();

    for (const [key, page] of this.pages) {
      if (!seen.has(page.id)) {
        pages.push({ id: page.id, name: page.name });
        seen.add(page.id);
      }
    }

    return pages;
  }

  /**
   * Get page by name or ID
   */
  getPage(pageIdentifier) {
    const page = this.pages.get(pageIdentifier.toLowerCase()) || this.pages.get(pageIdentifier);
    if (!page) {
      throw new Error(`Page not found: ${pageIdentifier}. Available pages: ${this.listPages().map(p => p.name).join(', ')}`);
    }
    return page;
  }

  /**
   * Post text to a Facebook Page
   */
  async postText(pageIdentifier, options = {}) {
    const page = this.getPage(pageIdentifier);

    const params = new URLSearchParams({
      access_token: page.token,
      ...(options.message && { message: options.message }),
      ...(options.link && { link: options.link }),
      ...(options.scheduledPublishTime && {
        published: 'false',
        scheduled_publish_time: options.scheduledPublishTime.toString(),
      }),
    });

    const response = await this.makeRequest(
      `https://graph.facebook.com/v21.0/${page.id}/feed?${params.toString()}`,
      'POST'
    );

    return {
      id: response.id,
      url: `https://facebook.com/${response.id}`,
    };
  }

  /**
   * Post photo to a Facebook Page
   */
  async postPhoto(pageIdentifier, options = {}) {
    const page = this.getPage(pageIdentifier);

    if (!fs.existsSync(options.filePath)) {
      throw new Error(`File not found: ${options.filePath}`);
    }

    const form = new FormData();
    form.append('source', fs.createReadStream(options.filePath));
    if (options.message) form.append('message', options.message);
    form.append('access_token', page.token);

    if (options.scheduledPublishTime) {
      form.append('published', 'false');
      form.append('scheduled_publish_time', options.scheduledPublishTime.toString());
    }

    const response = await this.makeFormRequest(
      `https://graph.facebook.com/v21.0/${page.id}/photos`,
      form
    );

    return {
      id: response.id || response.post_id,
      url: `https://facebook.com/${response.post_id || response.id}`,
    };
  }

  /**
   * Post video to a Facebook Page
   */
  async postVideo(pageIdentifier, options = {}) {
    const page = this.getPage(pageIdentifier);

    if (!fs.existsSync(options.filePath)) {
      throw new Error(`File not found: ${options.filePath}`);
    }

    const form = new FormData();
    form.append('source', fs.createReadStream(options.filePath));
    if (options.message) form.append('description', options.message);
    form.append('access_token', page.token);

    if (options.scheduledPublishTime) {
      form.append('published', 'false');
      form.append('scheduled_publish_time', options.scheduledPublishTime.toString());
    }

    const response = await this.makeFormRequest(
      `https://graph.facebook.com/v21.0/${page.id}/videos`,
      form
    );

    return {
      id: response.id,
      url: `https://facebook.com/${response.id}`,
    };
  }

  /**
   * Make an HTTPS request
   */
  makeRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method,
        headers: data ? { 'Content-Type': 'application/json' } : {},
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (parsed.error) {
              reject(new Error(`Facebook API Error: ${parsed.error.message}`));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${responseData}`));
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Make a form data request
   */
  makeFormRequest(url, form) {
    return new Promise((resolve, reject) => {
      form.submit(url, (err, res) => {
        if (err) return reject(err);

        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (parsed.error) {
              reject(new Error(`Facebook API Error: ${parsed.error.message}`));
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${responseData}`));
          }
        });
      });
    });
  }
}
