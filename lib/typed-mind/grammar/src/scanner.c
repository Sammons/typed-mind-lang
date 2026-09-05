#include "tree_sitter/parser.h"
#include <stdlib.h>

enum TokenType { OPAQUE_ANGLE_GROUP };

void *tree_sitter_typed_mind_external_scanner_create(void) { return NULL; }
void tree_sitter_typed_mind_external_scanner_destroy(void *payload) { (void)payload; }
unsigned tree_sitter_typed_mind_external_scanner_serialize(void *payload, char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}
void tree_sitter_typed_mind_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}

// The scanner holds no state between tokens. A rejected scan rewinds as one
// unit, so an unfinished group cannot consume a subsequent declaration.
bool tree_sitter_typed_mind_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  (void)payload;
  if (!valid_symbols[OPAQUE_ANGLE_GROUP]) return false;
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t') lexer->advance(lexer, true);
  if (lexer->lookahead != '<') return false;
  lexer->advance(lexer, false);
  if (lexer->lookahead == '=') return false;

  size_t length = 1, capacity = 16;
  char *stack = malloc(capacity);
  if (!stack) return false;
  stack[0] = '>';
  int32_t quote = 0;
  bool accepted = false;
  while (!lexer->eof(lexer)) {
    int32_t c = lexer->lookahead;
    if (c == '\n' || c == '\r') break;
    lexer->advance(lexer, false);
    if (quote) {
      if (c == '\\') {
        if (lexer->eof(lexer) || lexer->lookahead == '\n' || lexer->lookahead == '\r') break;
        lexer->advance(lexer, false);
      } else if (c == quote) {
        quote = 0;
      } else if (quote == '`' && c == '$' && lexer->lookahead == '{') {
        lexer->advance(lexer, false);
        // A template interpolation is a brace whose close resumes the quote.
        c = 't';
        quote = 0;
        goto push;
      }
      continue;
    }
    if (c == '\'' || c == '"' || c == '`') {
      quote = c;
      continue;
    }
    if ((c == '=' && lexer->lookahead == '>') ||
        ((c == '<' || c == '>') && lexer->lookahead == '=')) {
      lexer->advance(lexer, false);
      continue;
    }
    if (c == '<' || c == '(' || c == '[' || c == '{') {
      c = c == '<' ? '>' : c == '(' ? ')' : c == '[' ? ']' : '}';
push:
      if (length == capacity) {
        size_t next_capacity = capacity * 2;
        if (next_capacity < capacity) break;
        char *next = realloc(stack, next_capacity);
        if (!next) break;
        stack = next;
        capacity = next_capacity;
      }
      stack[length++] = (char)c;
    } else if (c == '>' || c == ')' || c == ']' || c == '}') {
      if (c == '}' && stack[length - 1] == 't') {
        --length;
        quote = '`';
      } else {
        if (stack[length - 1] != c) break;
        if (--length == 0) {
          lexer->mark_end(lexer);
          lexer->result_symbol = OPAQUE_ANGLE_GROUP;
          accepted = true;
          break;
        }
      }
    }
  }
  free(stack);
  return accepted;
}
