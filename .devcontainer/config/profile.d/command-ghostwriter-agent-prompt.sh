# Short, devcontainer-local prompt: agent:repo(branch)$
__cgw_git_branch() {
  git symbolic-ref --quiet --short HEAD 2>/dev/null || git rev-parse --short HEAD 2>/dev/null
}

__cgw_agent_prompt() {
  local agent="${AGENT_CONTAINER:-agent}"
  local dir="${PWD##*/}"
  local branch
  branch="$(__cgw_git_branch)"
  if [ -n "$branch" ]; then
    printf '%s:%s(%s)\$ ' "$agent" "$dir" "$branch"
  else
    printf '%s:%s\$ ' "$agent" "$dir"
  fi
}

case "$-" in
  *i*) PS1='$(__cgw_agent_prompt)' ;;
esac
