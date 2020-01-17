FROM ruby:2.6.5

WORKDIR /app
ADD . /app
RUN bundle install --path=vendor/bundle --deployment

CMD ["bundle", "exec", "ruby", "app.rb", "-o", "0.0.0.0"]
