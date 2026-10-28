/**
 * Facebook Graph API Integration
 * Posts text, photos, and videos to Facebook Pages
 */

import https from 'https';
import fs from 'fs';
import FormData from 'form-data';

interface FacebookPage {
  id: string;
  name: string;
  token: string;
}

interface PostOptions {
  message?: string;
  link?: string;
  scheduledPublishTime?: number; // Unix timestamp
}

interface MediaPostOptions extends PostOptions {
  filePath: string;
  mediaType: 'photo' | 'video';
}

export class FacebookPoster {
  private pages: Map<string, FacebookPage>;

  constructor() {
    this.pages = new Map();
    this.loadPages();
  }

  private loadPages() {
    // Load pages from environment variables
    let pageNum = 1;
    while (process.env[`FB_PAGE_${pageNum}_ID`]) {
      const page: FacebookPage = {
        id: process.env[`FB_PAGE_${pageNum}_ID`]!,
        name: process.env[`FB_PAGE_${pageNum}_NAME`]!,
        token: process.env[`FB_PAGE_${pageNum}_TOKEN`]!,
      };
      this.pages.set(page.name.toLowerCase(), page);
      this.pages.set(page.id, page);
      pageNum++;
    }
  }

  /**
   * List available pages
   */
  listPages(): Array<{ id: string; name: string }> {
    const pages: Array<{ id: string; name: string }> = [];
    const seen = new Set<string>();

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
  private getPage(pageIdentifier: string): FacebookPage {
    const page = this.pages.get(pageIdentifier.toLowerCase()) || this.pages.get(pageIdentifier);
    if (!page) {
      throw new Error(`Page not found: ${pageIdentifier}. Available pages: ${this.listPages().map(p => p.name).join(', ')}`);
    }
    return page;
  }

  /**
   * Post text to a Facebook Page
   */
  async postText(pageIdentifier: string, options: PostOptions): Promise<{ id: string; url: string }> {
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
  async postPhoto(pageIdentifier: string, options: MediaPostOptions): Promise<{ id: string; url: string }> {
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
  async postVideo(pageIdentifier: string, options: MediaPostOptions): Promise<{ id: string; url: string }> {
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
  private makeRequest(url: string, method: string = 'GET', data?: any): Promise<any> {
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
  private makeFormRequest(url: string, form: FormData): Promise<any> {
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

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const poster = new FacebookPoster();

  const command = process.argv[2];

  if (command === 'list') {
    console.log('Available Facebook Pages:');
    poster.listPages().forEach((page, i) => {
      console.log(`  ${i + 1}. ${page.name} (ID: ${page.id})`);
    });
  } else if (command === 'post') {
    const pageIdentifier = process.argv[3];
    const message = process.argv[4];

    if (!pageIdentifier || !message) {
      console.error('Usage: node facebook.js post <page-name-or-id> <message>');
      process.exit(1);
    }

    poster.postText(pageIdentifier, { message })
      .then(result => {
        console.log(`✅ Posted to Facebook!`);
        console.log(`Post ID: ${result.id}`);
        console.log(`URL: ${result.url}`);
      })
      .catch(error => {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
      });
  } else {
    console.log('Usage:');
    console.log('  node facebook.js list                          - List available pages');
    console.log('  node facebook.js post <page> <message>         - Post text to a page');
  }
}
