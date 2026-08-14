# Lesson sandbox — captures exit code and last command for validation.
PROMPT_COMMAND='echo "__LA:$?:$(history 1 | sed "s/^[ ]*[0-9]*[ ]*//")"'
PS1='$ '
