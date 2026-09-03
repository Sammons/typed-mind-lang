// Side-effect import: no named bindings, no default. The canonical
// custom-elements registration idiom (and the shape every Lit app's entry
// module uses). The module edge is real and the analyzer resolves it, but a
// bindingless import contributes nothing to the importing File's `<-` list,
// so the target file reads as orphaned.
import './components/widget.ts';

export const boot = (): string => {
  return 'booted';
};
