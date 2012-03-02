
package main

import (
  "io/ioutil"
  "strconv"
  "strings"
  "fmt"
  "net/http"
  "encoding/json"
)

func main() {

  indexHandler := staticFileHandler("index.html")

  http.HandleFunc("/viz", indexHandler)
  http.HandleFunc("/data/", dataHandlerGen())

  fmt.Println("Starting http server...")
  err := http.ListenAndServe("0.0.0.0:8888", nil)
  if err != nil {
    fmt.Println(err)
  }
}

func staticFileHandler(file_name string) func(http.ResponseWriter,
                                               *http.Request) {
  return func(w http.ResponseWriter, req *http.Request) {
    fmt.Println("New Request")
    file_data, _ := ioutil.ReadFile(file_name)
    _, _ = w.Write(file_data)
  }
}

func dataHandlerGen() func(http.ResponseWriter, *http.Request) {
  words := UnmarshalJsonList("/home/robert/ngrams/word-list.json")
  return func(w http.ResponseWriter, req *http.Request) {
    path := req.URL.Path

    rangeText := strings.Split(path, "/")
    lower, err := strconv.Atoi(rangeText[2])
    upper, err2 := strconv.Atoi(rangeText[3])

    if err != nil {
      fmt.Println("Error: ", err)
      return
    } else if err2 != nil {
      fmt.Println("Error: ", err2)
      return
    }

    if upper - 1 > len(words) {upper = len(words) - 1}

    fmt.Println("Json Request for words", lower, " through ",  upper)

    data := make([]XYonly, upper - lower)

    fmt.Println("there are ", len(words), " words.")
    count := 0
    for i := lower; i < upper; i++ {
      data[count] = words[i].TotPgDenBkCnt()
      count++
    }

    marshaled, err := json.Marshal(data)
    if err != nil {
      fmt.Println("Error: ", err)
      return
    }
    _, _ = w.Write(marshaled)
  }
}

