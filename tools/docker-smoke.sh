#!/usr/bin/env bash
# Test de fumée d'une instance Parenthèse, par le port web uniquement, comme un vrai utilisateur.
#
#   bash tools/docker-smoke.sh                        instance sur http://localhost
#   bash tools/docker-smoke.sh http://localhost:8080  si WEB_PORT=8080
#
# Vérifie : page d'accueil, /health (direct et via /api), création de compte, connexion,
# création d'une galaxie, lecture de son graphe, puis suppression de la galaxie.
# Le compte de test (smoke-...@example.com) reste en base : l'API n'a pas de route de suppression de compte.
# Nécessite curl et jq. Code de sortie 0 si tout passe, 1 sinon.
set -euo pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost}}"
BASE_URL="${BASE_URL%/}"
WAIT_SECONDS="${SMOKE_WAIT_SECONDS:-90}"

for cmd in curl jq; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Commande manquante : $cmd" >&2
    exit 1
  fi
done

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
BODY="$WORK_DIR/body"

fail() {
  echo "ÉCHEC : $*" >&2
  if [ -s "$BODY" ]; then
    echo "Réponse reçue :" >&2
    head -c 2000 "$BODY" >&2
    echo >&2
  fi
  exit 1
}

ok() {
  echo "ok   $*"
}

# request MÉTHODE CHEMIN [CORPS_JSON] [JETON] : écrit le corps dans $BODY et affiche le code HTTP.
request() {
  local method="$1" path="$2" body="${3:-}" token="${4:-}"
  local args=(-sS -o "$BODY" -w '%{http_code}' -X "$method" --max-time 30)
  if [ -n "$body" ]; then
    args+=(-H 'Content-Type: application/json' --data "$body")
  fi
  if [ -n "$token" ]; then
    args+=(-H "Authorization: Bearer $token")
  fi
  curl "${args[@]}" "$BASE_URL$path"
}

expect_status() {
  local got="$1" expected="$2" label="$3"
  [ "$got" = "$expected" ] || fail "$label : HTTP $got, attendu $expected"
}

echo "Instance testée : $BASE_URL"

# 0. Attente de l'API derrière nginx
deadline=$((SECONDS + WAIT_SECONDS))
until curl -fsS --max-time 5 -o /dev/null "$BASE_URL/health" 2>/dev/null; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    : > "$BODY"
    fail "$BASE_URL/health ne répond pas après ${WAIT_SECONDS} s"
  fi
  sleep 2
done

# 1. Page d'accueil servie par nginx
status="$(curl -sS -o "$BODY" -w '%{http_code} %{content_type}' --max-time 30 "$BASE_URL/")" \
  || fail "page d'accueil injoignable"
code="${status%% *}"
content_type="${status#* }"
expect_status "$code" 200 "GET /"
case "$content_type" in
  text/html*) ;;
  *) fail "GET / : type $content_type, attendu text/html" ;;
esac
grep -q 'id="root"' "$BODY" || fail "GET / : la page ne contient pas l'application"
ok "GET / (HTML)"

# 2. Santé de l'API, relayée telle quelle et via le préfixe /api retiré par nginx
for path in /health /api/health; do
  code="$(request GET "$path")" || fail "$path injoignable"
  expect_status "$code" 200 "GET $path"
  jq -e '.ok == true' "$BODY" >/dev/null || fail "GET $path : réponse inattendue"
  ok "GET $path"
done

# 3. Création de compte
stamp="$(date +%s)-$RANDOM"
email="smoke-$stamp@example.com"
password="smoke-$RANDOM$RANDOM$RANDOM"
credentials="$(jq -nc --arg email "$email" --arg password "$password" \
  '{firstName: "Test", email: $email, password: $password}')"

code="$(request POST /auth/register "$credentials")" || fail "POST /auth/register injoignable"
expect_status "$code" 201 "POST /auth/register"
jq -e '(.token | type == "string" and length > 0) and .user.email == $email' --arg email "$email" "$BODY" >/dev/null \
  || fail "POST /auth/register : jeton ou utilisateur absent"
ok "POST /auth/register ($email)"

# 4. Connexion
code="$(request POST /auth/login "$credentials")" || fail "POST /auth/login injoignable"
expect_status "$code" 200 "POST /auth/login"
token="$(jq -r '.token // empty' "$BODY")"
[ -n "$token" ] || fail "POST /auth/login : jeton absent"
ok "POST /auth/login"

# 5. Création d'une galaxie
tree_payload="$(jq -nc --arg slug "smoke-$stamp" \
  '{name: "Galaxie de test", slug: $slug, visitorPassword: "visiteur-test-1", contributorPassword: "contributeur-test-1"}')"
code="$(request POST /trees "$tree_payload" "$token")" || fail "POST /trees injoignable"
expect_status "$code" 201 "POST /trees"
tree_id="$(jq -r '.tree.id // empty' "$BODY")"
[ -n "$tree_id" ] || fail "POST /trees : identifiant absent"
ok "POST /trees ($tree_id)"

# 6. Lecture du graphe
code="$(request GET "/trees/$tree_id/graph" "" "$token")" || fail "GET /trees/:id/graph injoignable"
expect_status "$code" 200 "GET /trees/:id/graph"
jq -e --arg id "$tree_id" '.treeId == $id and (.graph.persons | type == "array")' "$BODY" >/dev/null \
  || fail "GET /trees/:id/graph : graphe inattendu"
ok "GET /trees/:id/graph"

# 7. Suppression de la galaxie de test
code="$(request DELETE "/trees/$tree_id" "" "$token")" || fail "DELETE /trees/:id injoignable"
expect_status "$code" 200 "DELETE /trees/:id"
ok "DELETE /trees/:id"

echo "Instance opérationnelle."
