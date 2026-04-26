import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'MCP Gateway',
  tagline: 'Public HTTPS URL for your local MCP server',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://mcp-gateway.info',
  baseUrl: '/docs/',

  organizationName: 'AlDiveev',
  projectName: 'mcp-gateway',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/AlDiveev/mcp-gateway/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'MCP Gateway',
      logo: {
        alt: 'MCP Gateway',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://mcp-gateway.info/',
          label: 'Home',
          position: 'right',
        },
        {
          href: 'https://github.com/AlDiveev/mcp-gateway',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Introduction', to: '/'},
            {label: 'Installation', to: '/installation'},
            {label: 'Quickstart', to: '/quickstart'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'Landing', href: 'https://mcp-gateway.info/'},
            {label: 'GitHub', href: 'https://github.com/AlDiveev/mcp-gateway'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} MCP Gateway.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
