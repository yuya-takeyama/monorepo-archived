package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "This is Bar Service!")
	})

	log.Fatal(http.ListenAndServe(":8080", nil))
}
