function New-Blueprint($name) {
    $path = "blueprints/$name.component.md"
@"
# Component: $name

## 1. Props
List all props.

## 2. Data Source
Where data comes from.

## 3. Behavior
Logic and rules.

## 4. Layout
Structure of the component.

## 5. Styling
Use design tokens.

## 6. Child Components
List dependencies.

## 7. State Logic
Internal state rules.

## 8. Events
Click, hover, etc.

## 9. Notes for Antigravity
Special instructions.
"@ | Out-File -Encoding utf8 $path
}
