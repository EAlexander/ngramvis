
package main

import (
  "io/ioutil"
  "strconv"
  "strings"
  "fmt"
  "net/http"
  "encoding/json"
)

const (
  dbServer = "localhost"
  dbName = "ngrams"
  collecName = "words"
)
const (
  cleanRaw = false
)

func main() {
  if cleanRaw {
    ProcessRaw()
    return
  }

  http.HandleFunc("/viz", indexHandler)
  http.HandleFunc("/viz/viz.js", vizScriptHandler)
  http.HandleFunc("/data/", dataHandlerGen())

  fmt.Println("Starting http server...")
  err := http.ListenAndServe("0.0.0.0:8888", nil)
  if err != nil {
    fmt.Println(err)
    return
  }
}

func indexHandler(w http.ResponseWriter, req *http.Request) {
    file_name := "index.html"
    file_data, _ := ioutil.ReadFile(file_name)
    _, _ = w.Write(file_data)
}

func vizScriptHandler(w http.ResponseWriter, req *http.Request) {
    file_name := "viz.js"
    file_data, _ := ioutil.ReadFile(file_name)
    w.Header().Set("Content-Type", "text/javascript")
    _, _ = w.Write(file_data)
}

func dataHandlerGen() func(http.ResponseWriter, *http.Request) {
  words := UnmarshalJsonList(jsonWords)
  data := make([]*XYonly, 0)

  var weights, maxes Weights
  maxes = GetMaxes(words)

  return func(w http.ResponseWriter, req *http.Request) {
    defer func() {
      if r := recover(); r != nil {
        fmt.Println("Recovered in 'handler'", r)
      }
    }()

    path := req.URL.Path

    rangeText := strings.Split(path, "/")
    if rangeText[2] == "reweight" {
      fmt.Println("reweighting...")
      year := rangeText[3]
      length, _ := strconv.ParseFloat(rangeText[4], 32)
      count, _ := strconv.ParseFloat(rangeText[5], 32)
      pages, _ := strconv.ParseFloat(rangeText[6], 32)
      books, _ := strconv.ParseFloat(rangeText[7], 32)

      weights.Length = float32(length)
      weights.Count = float32(count)
      weights.Pages = float32(pages)
      weights.Books = float32(books)

      // get score calcing function
      scorer := WeightedScoreGenerator(year, weights, maxes)

      fmt.Println("generating scores...")
      // generate scores for words if possible
      scored, scores := GetScores(words, scorer)

      fmt.Println("building XYonly structs...")
      // convert to XYonly structs
      data = BuildXY(scored, scores, BkVpden(year))

      // sort it
      fmt.Println("sorting...")
      data = TreeToXYonly(XYonlyToTree(data, func(a, b interface{}) bool {
        return a.(*XYonly).S <= b.(*XYonly).S
      }))
      fmt.Println("[]XYonly length = ", len(data))

      return
    }

    fmt.Println("filling data request...")

    lower, err := strconv.Atoi(rangeText[2])
    if err != nil {
      panic(err)
    }
    numWanted, err := strconv.Atoi(rangeText[3])
    if err != nil {
      panic(err)
    }

    marshaled, err := json.Marshal(data[lower:lower + numWanted])
    if err != nil {
      panic(err)
    }

    _, _ = w.Write(marshaled)
  }
}

