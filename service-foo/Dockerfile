FROM ruby:3.0.0

WORKDIR /app
ADD . /app
RUN bundle update --bundler
RUN bundle install --path=vendor/bundle --deployment

CMD ["bundle", "exec", "ruby", "app.rb", "-o", "0.0.0.0"]
