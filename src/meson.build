pkgdatadir = get_option('datadir') / meson.project_name()
gnome = import('gnome')

python3 = find_program('python3')

gresource_xml = custom_target(
  'gnome-tutor-gresource-xml',
  output: 'ir.urumlug.gnomeTutor.src.gresource.xml',
  command: [
    python3,
    files('../tools/generate-gresource.py'),
    meson.current_source_dir(),
    '@OUTPUT@',
  ],
  depend_files: files(
    '../tools/generate-gresource.py',
  ),
  build_by_default: true,
)

test(
  'gresource-complete',
  python3,
  args: [
    files('../tools/verify-gresource.py'),
    meson.current_source_dir(),
    gresource_xml,
  ],
)

src_res = gnome.compile_resources('ir.urumlug.gnomeTutor.src',
  gresource_xml,
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

configure_file(
  input: 'ir.urumlug.gnomeTutor.in',
  output: 'ir.urumlug.gnomeTutor',
  configuration: bin_conf,
  install: true,
  install_dir: get_option('bindir')
)
