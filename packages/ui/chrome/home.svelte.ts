/**
 * The home: the page the menu declares as `home_page`, shown in the work area
 * when the stack is empty. MenuSidebar learns it from `get_menu`; the logo and
 * the title go back to it by clearing the stack.
 */
export const home = $state<{ page: string | null }>({ page: null });
