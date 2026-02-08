import {
  addPlugin,
  addServerHandler,
  addServerPlugin,
  createResolver,
  defineNuxtModule
} from '@nuxt/kit';

export default defineNuxtModule({
  meta: { name: 'or3-provider-basic-auth' },
  setup() {
    const { resolve } = createResolver(import.meta.url);

    addServerPlugin(resolve('runtime/server/plugins/register'));

    addServerHandler({
      route: '/api/basic-auth/sign-in',
      method: 'post',
      handler: resolve('runtime/server/api/basic-auth/sign-in.post')
    });
    addServerHandler({
      route: '/api/basic-auth/sign-out',
      method: 'post',
      handler: resolve('runtime/server/api/basic-auth/sign-out.post')
    });
    addServerHandler({
      route: '/api/basic-auth/refresh',
      method: 'post',
      handler: resolve('runtime/server/api/basic-auth/refresh.post')
    });
    addServerHandler({
      route: '/api/basic-auth/change-password',
      method: 'post',
      handler: resolve('runtime/server/api/basic-auth/change-password.post')
    });

    addPlugin(resolve('runtime/plugins/basic-auth-ui.client'), {
      append: true
    });
  }
});
