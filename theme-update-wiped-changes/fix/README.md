# Use the rescued child theme

I recovered the CSS and notice from the edited parent backup. The child is written for Twenty Twenty-One; another parent needs its own template name, stylesheet dependency and compatibility checks.

For this reproduction, `scripts/stage.sh fixed` installs and activates it automatically. For a matching WordPress installation:

1. Back up the database and existing theme files before replacing the edited parent.
2. Install a clean Twenty Twenty-One parent. Keep it installed for inheritance.
3. Upload `proof/repair-child.zip` through Appearance → Themes → Add New → Upload Theme, then activate Furniture Repair Child.
4. Set the notice's destination to the existing repair-services page: `wp option update repair_services_page PAGE_ID`. The reproduction's fixture sets this automatically.
5. Check the front page and the notice's link. Check Appearance → Menus if the existing primary menu needs reassignment, then check the phone menu.

I keep the parent enabled for updates. The child contains only the rescued notice and styling; it does not copy parent templates or disable updates. The notice uses a named WordPress hook and escapes its destination. Keep the original backup until the repaired site has been checked.
