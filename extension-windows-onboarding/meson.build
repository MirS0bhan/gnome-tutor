install_subdir('.',
  install_dir: get_option('datadir') / meson.project_name() / 'extension-windows-onboarding',
  exclude_files: ['meson.build'],
  exclude_directories: ['po'],
)

meson.add_install_script(
  find_program('sh'),
  '-c',
  'glib-compile-schemas "$MESON_INSTALL_DESTDIR_PREFIX/@0@"'.format(
    get_option('datadir') / meson.project_name() / 'extension-windows-onboarding' / 'schemas'
  ),
)

subdir('po')
