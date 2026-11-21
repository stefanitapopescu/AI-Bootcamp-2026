#!/usr/bin/env bash
# PreToolUse (Write|Edit|MultiEdit): blochează scrierea de chei secrete în cod.
# - cheia Anthropic (sk-ant-...) nicăieri în afară de fișierele .env din afara web/
# - cheia Supabase service_role / sb_secret_ nicăieri în web/ (nici în .env de acolo:
#   Vite pune variabilele VITE_* în codul trimis browserului, deci oricine le vede)
input=$(cat)

file=$(printf '%s' "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 \
  | sed 's/.*"\([^"]*\)"$/\1/' | tr '\\' '/' | sed 's#//*#/#g')
[ -z "$file" ] && exit 0

client=0
case "$file" in
  */web/*|web/*|*/android/*|android/*|*/admin-web/*|admin-web/*) client=1 ;;
esac

if [ "$client" = 1 ]; then
  if printf '%s' "$input" | grep -Eq 'sk-ant-(api|admin)[0-9]*-[A-Za-z0-9_-]{20,}'; then
    echo "Blocat de guard-secrets: cheie Anthropic (sk-ant-...) în codul de client. Tot ce e în web/ (inclusiv .env cu VITE_*) ajunge în browser. Cheia stă doar în backend/.env, iar apelurile la Claude trec prin backend/." >&2
    exit 2
  fi
  if printf '%s' "$input" | grep -Eqi 'service_role|sb_secret_[A-Za-z0-9_-]{10,}'; then
    echo "Blocat de guard-secrets: cheia Supabase service_role/secret nu are voie în web/ (codul de client e public, inclusiv .env cu VITE_*). Folosește cheia publică (anon/publishable) + RLS; operațiile care ocolesc RLS trec prin backend/." >&2
    exit 2
  fi
  exit 0
fi

case "$file" in
  *.env|*/.env.*|*.env.example) exit 0 ;;
esac

if printf '%s' "$input" | grep -Eq 'sk-ant-(api|admin)[0-9]*-[A-Za-z0-9_-]{20,}'; then
  echo "Blocat de guard-secrets: textul conține o cheie Anthropic (sk-ant-...). Pune cheia în backend/.env (ignorat de git) și citește-o cu os.environ, nu o scrie în cod." >&2
  exit 2
fi
exit 0
