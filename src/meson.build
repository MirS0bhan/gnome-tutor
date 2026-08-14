pkgdatadir = get_option('datadir') / meson.project_name()
gnome = import('gnome')

src_res = gnome.compile_resources('ir.urumlug.gnomeTutor.src',
  'ir.urumlug.gnomeTutor.src.gresource.xml',
  gresource_bundle: true,
  install: true,
  install_dir: pkgdatadir,
)

data_res = gnome.compile_resources('ir.urumlug.gnomeTutor.data',
  'ir.urumlug.gnomeTutor.data.gresource.xml',
  gresource_bundle: true,
  install: true,
  install_dir: pkgdatadir,
)

bin_conf = configuration_data()
bin_conf.set('GJS', find_program('gjs').full_path())
bin_conf.set('PACKAGE_VERSION', meson.project_version())
bin_conf.set('PACKAGE_NAME', meson.project_name())
bin_conf.set('prefix', get_option('prefix'))
bin_conf.set('libdir', get_option('prefix') / get_option('libdir'))
bin_conf.set('datadir', get_option('prefix') / get_option('datadir'))
bin_conf.set('resource_path', '/ir/urumlug/gnomeTutor')
bin_conf.set('build_root', meson.project_build_root())

configure_file(
  input: 'ir.urumlug.gnomeTutor.in',
  output: 'ir.urumlug.gnomeTutor',
  configuration: bin_conf,
  install: true,
  install_dir: get_option('bindir')
)
