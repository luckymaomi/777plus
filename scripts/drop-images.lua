function Image()
  return {}
end

function Span(element)
  for _, class_name in ipairs(element.classes) do
    if class_name == "comment-start" or class_name == "comment-end" or class_name == "annotation" then
      return {}
    end
  end
end
