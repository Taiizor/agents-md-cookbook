# AGENTS.md

Ruby on Rails application. Replace the bracketed bits with your details.

## Stack

- Ruby 3.3, Rails 7.1.
- Dependency manager: Bundler. Lint: RuboCop. Tests: RSpec.

## Project Structure

- `app/` — MVC code: `models/`, `controllers/`, `views/`, `jobs/`, `services/`.
- `config/` — routes, environments, `credentials`; `db/` — schema + migrations.
- `spec/` — RSpec tests mirroring `app/`; `Gemfile` — dependencies.

## Setup

```bash
bundle install               # install gems
cp .env.example .env         # local config; never commit .env
bin/rails db:setup           # create + migrate + seed the dev DB
```

## Commands

```bash
bin/rails server                       # dev server (http://localhost:3000)
bundle exec rspec                      # run all specs
bundle exec rspec spec/models/order_spec.rb   # one spec file
bin/rails db:migrate                   # apply migrations
bin/rails g migration AddXToY x:string # generate a migration
bundle exec rubocop -A                 # lint + autocorrect
```

## Code style

- Follow RuboCop (rails + rspec cops); run `rubocop -A` before committing.
- Keep controllers skinny; push logic into models, service objects, or jobs.
- Use strong parameters; never pass raw `params` to `update`/`create`.

Example — a service object with strong params in the controller:

```ruby
class OrdersController < ApplicationController
  def create
    order = Orders::Create.call(order_params)
    render json: order, status: :created
  end

  private

  def order_params
    params.require(:order).permit(:sku, :qty)
  end
end
```

## Testing

- Specs live under `spec/`, mirroring `app/`.
- A change is done when `bundle exec rubocop` and `bundle exec rspec` pass.
- Add a failing spec first, then make it pass (TDD).

## Git & PRs

1. Branch from `main`: `git switch -c feat/<short-name>`.
2. Conventional Commits (`feat:`, `fix:`, `chore:`).
3. Before pushing: `bundle exec rubocop && bundle exec rspec`.
4. PR: one-line summary + the test command you ran + any new migrations.

## Boundaries

- Always: edit `app/**`, read `.env.example` for required config, and run
  `rubocop -A` plus `rspec` before pushing.
- Always: generate a new migration for schema changes and re-run `db:migrate`.
- Always: use strong parameters and parameterized queries (`where(id: id)`).
- Ask first: before changing the `Gemfile`, initializers, or routes that
  affect auth or external integrations.
- Never: edit an already-applied migration — add a new one instead.
- Never: skip strong parameters or interpolate user input into SQL.
- Never commit secrets, `master.key`, or `.env`.

## More

- Domain/service layout: `docs/architecture.md`.
