require 'sinatra'

get '/' do
  "This is Foo Service, NAMESPACE=#{ENV.fetch('NAMESPACE')}!\n"
end
