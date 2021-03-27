package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/bar", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "This is Bar Service, Ver. 2021/03/22!")
	})

	log.Fatal(http.ListenAndServe(":8080", nil))
}
