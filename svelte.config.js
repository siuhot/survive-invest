import adapter from '@sveltejs/adapter-static';

const config = {
  kit: {
    adapter: adapter(),
    csrf: { checkOrigin: false }
  }
};

export default config;
